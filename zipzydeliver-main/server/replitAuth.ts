import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Enable a development fallback auth when Replit OIDC env vars are missing
// Force dev mode for local development
const devAuthFallback = process.env.NODE_ENV === 'development' || !process.env.REPLIT_DOMAINS || !process.env.REPL_ID;
// Optional override: require explicit login even in dev fallback
const devRequireLogin = process.env.DEV_REQUIRE_LOGIN === 'true';

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  // In dev fallback, use in-memory session store to avoid DB coupling
  if (devAuthFallback) {
    return session({
      secret: process.env.SESSION_SECRET || "dev-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false,
        maxAge: sessionTtl,
      },
    });
  }

  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Dev fallback: create a simple always-authenticated user
  if (devAuthFallback) {
    console.log('🔧 Using development authentication fallback');
    // Ensure a dev user exists in the DB for testing
    const devUser = {
      id: "dev-user",
      email: "dev@example.com",
      firstName: "Dev",
      lastName: "User",
      profileImageUrl: "",
      isAdmin: true,
    } as any;
    await storage.upsertUser(devUser);

    if (devRequireLogin) {
      // Require explicit dev login; manage session flag
      app.post('/api/dev/login', (req, res) => {
        (req.session as any).devUser = devUser;
        res.json({ ok: true });
      });
      app.post('/api/dev/logout', (req, res) => {
        if (req.session) {
          req.session.destroy(() => res.json({ ok: true }));
        } else {
          res.json({ ok: true });
        }
      });
      // Dev login/logout redirects for convenience
      app.get('/api/login', (_req, res) => res.redirect('/login'));
      app.get('/api/logout', (_req, res) => res.redirect('/login'));
    } else {
      // Auto-authenticate every request (previous behavior)
      app.use((req, _res, next) => {
        (req as any).user = {
          claims: {
            sub: "dev-user",
            email: "dev@example.com",
            first_name: "Dev",
            last_name: "User",
            profile_image_url: "",
          },
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        };
        (req as any).isAuthenticated = () => true;
        next();
      });
      // No-op login/logout routes for dev
      app.get("/api/login", (_req, res) => res.redirect("/"));
      app.get("/api/callback", (_req, res) => res.redirect("/"));
      app.get("/api/logout", (_req, res) => res.redirect("/"));
    }
    return;
  }

  app.use(passport.initialize());
  app.use(passport.session());

  // Skip OIDC setup in development mode
  if (devAuthFallback) {
    console.log('🔧 Skipping OIDC setup in development mode');
    return;
  }

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (devAuthFallback) {
    if (devRequireLogin) {
      // Check session-based dev login
      const sessionUser = (req.session as any)?.devUser;
      if (!sessionUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      // Populate req.user in the same shape as OIDC
      (req as any).user = {
        claims: {
          sub: sessionUser.id,
          email: sessionUser.email,
          first_name: sessionUser.firstName,
          last_name: sessionUser.lastName,
          profile_image_url: sessionUser.profileImageUrl,
        },
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };
      return next();
    }
    return next();
  }
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
