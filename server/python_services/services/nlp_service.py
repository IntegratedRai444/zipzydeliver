import spacy
from transformers import pipeline, AutoTokenizer, AutoModel
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer
import openai
import asyncio
from datetime import datetime
from typing import Dict, List, Any, Optional
import logging
import re
import json

logger = logging.getLogger(__name__)

class NLPService:
    def __init__(self):
        # Load models
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            logger.warning("SpaCy model not found, using basic text processing")
            self.nlp = None
        
        # Initialize sentiment analyzer
        try:
            nltk.download('vader_lexicon', quiet=True)
            self.sentiment_analyzer = SentimentIntensityAnalyzer()
        except Exception as e:
            logger.warning(f"VADER sentiment analyzer not available: {e}")
            self.sentiment_analyzer = None
        
        # Initialize transformers pipelines
        try:
            self.qa_pipeline = pipeline("question-answering")
            self.text_generator = pipeline("text-generation")
            self.classifier = pipeline("text-classification")
        except Exception as e:
            logger.warning(f"Transformers pipelines not available: {e}")
            self.qa_pipeline = None
            self.text_generator = None
            self.classifier = None
        
        # Initialize OpenAI
        self.openai_client = None
        try:
            # This would be set from environment variables
            # self.openai_client = openai.OpenAI(api_key="your-api-key")
            pass
        except Exception as e:
            logger.warning(f"OpenAI client not available: {e}")
    
    async def analyze_customer_feedback(self, feedback_text: str) -> Dict[str, Any]:
        """Analyze customer feedback using NLP"""
        try:
            analysis = {
                "sentiment": {},
                "entities": [],
                "key_phrases": [],
                "intent": "",
                "overall_score": 0.0,
                "categories": [],
                "urgency_level": "low"
            }
            
            # Sentiment analysis
            if self.sentiment_analyzer:
                sentiment_scores = self.sentiment_analyzer.polarity_scores(feedback_text)
                analysis["sentiment"] = sentiment_scores
                analysis["overall_score"] = sentiment_scores['compound']
                
                # Determine urgency based on sentiment
                if sentiment_scores['compound'] < -0.5:
                    analysis["urgency_level"] = "high"
                elif sentiment_scores['compound'] < 0:
                    analysis["urgency_level"] = "medium"
                else:
                    analysis["urgency_level"] = "low"
            
            # Named entity recognition
            if self.nlp:
                doc = self.nlp(feedback_text)
                entities = [(ent.text, ent.label_) for ent in doc.ents]
                analysis["entities"] = entities
            
            # Key phrase extraction
            analysis["key_phrases"] = self.extract_key_phrases(feedback_text)
            
            # Intent classification
            analysis["intent"] = self.classify_intent(feedback_text)
            
            # Category classification
            analysis["categories"] = self.classify_categories(feedback_text)
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error in feedback analysis: {e}")
            raise e
    
    async def classify_support_tickets(self, ticket_text: str) -> Dict[str, Any]:
        """Classify support tickets using NLP"""
        try:
            classification = {
                "category": "",
                "priority": "medium",
                "urgency": "normal",
                "assigned_department": "",
                "estimated_resolution_time": "24h",
                "similar_tickets": [],
                "confidence": 0.0
            }
            
            # Category classification
            categories = {
                "order_issue": ["order", "delivery", "food", "missing", "wrong"],
                "payment_problem": ["payment", "billing", "charge", "refund", "money"],
                "technical_issue": ["app", "website", "login", "error", "crash"],
                "delivery_concern": ["delivery", "late", "driver", "location", "time"],
                "quality_issue": ["quality", "taste", "fresh", "cold", "spoiled"],
                "account_issue": ["account", "profile", "password", "email", "phone"]
            }
            
            text_lower = ticket_text.lower()
            category_scores = {}
            
            for category, keywords in categories.items():
                score = sum(1 for keyword in keywords if keyword in text_lower)
                category_scores[category] = score
            
            if category_scores:
                best_category = max(category_scores, key=category_scores.get)
                classification["category"] = best_category
                classification["confidence"] = min(1.0, category_scores[best_category] / 5)
            
            # Priority classification
            priority_keywords = {
                "high": ["urgent", "emergency", "critical", "immediate", "asap"],
                "medium": ["important", "soon", "today", "tomorrow"],
                "low": ["when possible", "no rush", "sometime"]
            }
            
            for priority, keywords in priority_keywords.items():
                if any(keyword in text_lower for keyword in keywords):
                    classification["priority"] = priority
                    break
            
            # Urgency classification
            urgency_indicators = {
                "high": ["urgent", "emergency", "critical", "immediate", "asap", "now"],
                "medium": ["soon", "today", "tomorrow", "quickly"],
                "low": ["when possible", "no rush", "sometime", "later"]
            }
            
            for urgency, indicators in urgency_indicators.items():
                if any(indicator in text_lower for indicator in indicators):
                    classification["urgency"] = urgency
                    break
            
            # Department assignment
            department_mapping = {
                "order_issue": "operations",
                "payment_problem": "finance",
                "technical_issue": "tech_support",
                "delivery_concern": "logistics",
                "quality_issue": "quality_assurance",
                "account_issue": "customer_service"
            }
            
            classification["assigned_department"] = department_mapping.get(
                classification["category"], "customer_service"
            )
            
            # Resolution time estimation
            resolution_times = {
                "high": "4h",
                "medium": "24h", 
                "low": "72h"
            }
            
            classification["estimated_resolution_time"] = resolution_times.get(
                classification["priority"], "24h"
            )
            
            return classification
            
        except Exception as e:
            logger.error(f"Error in ticket classification: {e}")
            raise e
    
    async def extract_order_intent(self, text: str) -> Dict[str, Any]:
        """Extract order intention from text"""
        try:
            intent_analysis = {
                "intent_type": "",
                "confidence": 0.0,
                "entities": [],
                "quantities": [],
                "products": [],
                "delivery_preferences": {},
                "payment_intent": ""
            }
            
            text_lower = text.lower()
            
            # Intent classification
            intents = {
                "place_order": ["order", "buy", "get", "want", "need", "deliver"],
                "modify_order": ["change", "modify", "update", "edit", "cancel"],
                "track_order": ["track", "where", "status", "delivery", "arrival"],
                "complain": ["complain", "issue", "problem", "wrong", "bad", "terrible"],
                "inquire": ["question", "ask", "wonder", "curious", "information"],
                "feedback": ["feedback", "review", "rating", "experience", "opinion"]
            }
            
            intent_scores = {}
            for intent, keywords in intents.items():
                score = sum(1 for keyword in keywords if keyword in text_lower)
                intent_scores[intent] = score
            
            if intent_scores:
                best_intent = max(intent_scores, key=intent_scores.get)
                intent_analysis["intent_type"] = best_intent
                intent_analysis["confidence"] = min(1.0, intent_scores[best_intent] / 3)
            
            # Entity extraction
            if self.nlp:
                doc = self.nlp(text)
                entities = [(ent.text, ent.label_) for ent in doc.ents]
                intent_analysis["entities"] = entities
                
                # Extract quantities
                quantities = [ent.text for ent in doc.ents if ent.label_ == "CARDINAL"]
                intent_analysis["quantities"] = quantities
                
                # Extract products (noun chunks)
                products = [chunk.text for chunk in doc.noun_chunks if chunk.text.lower() not in ["i", "you", "it", "this", "that"]]
                intent_analysis["products"] = products
            
            # Delivery preferences
            delivery_keywords = {
                "fast": ["fast", "quick", "urgent", "asap", "immediate"],
                "scheduled": ["schedule", "time", "when", "later", "tomorrow"],
                "specific_location": ["location", "address", "place", "building", "room"]
            }
            
            for preference, keywords in delivery_keywords.items():
                if any(keyword in text_lower for keyword in keywords):
                    intent_analysis["delivery_preferences"][preference] = True
            
            # Payment intent
            payment_keywords = {
                "cod": ["cash", "cod", "cash on delivery"],
                "online": ["online", "card", "credit", "debit", "upi"],
                "wallet": ["wallet", "paytm", "phonepe", "gpay"]
            }
            
            for payment, keywords in payment_keywords.items():
                if any(keyword in text_lower for keyword in keywords):
                    intent_analysis["payment_intent"] = payment
                    break
            
            return intent_analysis
            
        except Exception as e:
            logger.error(f"Error in intent extraction: {e}")
            raise e
    
    async def generate_smart_response(self, query: str, context: Dict[str, Any]) -> str:
        """Generate intelligent response using AI"""
        try:
            # Try OpenAI first if available
            if self.openai_client:
                try:
                    response = self.openai_client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=[
                            {"role": "system", "content": "You are a helpful delivery service assistant. Provide clear, helpful responses."},
                            {"role": "user", "content": f"Context: {context}\nQuery: {query}"}
                        ],
                        max_tokens=150,
                        temperature=0.7
                    )
                    return response.choices[0].message.content
                except Exception as e:
                    logger.warning(f"OpenAI failed, falling back to local model: {e}")
            
            # Fallback to local model
            return self.local_response_generation(query, context)
            
        except Exception as e:
            logger.error(f"Error in response generation: {e}")
            return "I apologize, but I'm having trouble generating a response right now. Please try again later."
    
    async def detect_urgent_issues(self, text: str) -> Dict[str, Any]:
        """Detect urgent issues in customer messages"""
        try:
            urgency_analysis = {
                "is_urgent": False,
                "urgency_level": "low",
                "urgency_reasons": [],
                "response_priority": "normal",
                "escalation_needed": False,
                "estimated_response_time": "24h"
            }
            
            text_lower = text.lower()
            
            # High urgency indicators
            high_urgency_keywords = [
                "emergency", "urgent", "critical", "immediate", "asap", "now",
                "broken", "crashed", "error", "failed", "not working",
                "sick", "ill", "allergic", "poison", "dangerous"
            ]
            
            # Medium urgency indicators
            medium_urgency_keywords = [
                "important", "soon", "today", "tomorrow", "quickly",
                "problem", "issue", "trouble", "difficulty", "concern"
            ]
            
            # Check for high urgency
            high_urgency_found = any(keyword in text_lower for keyword in high_urgency_keywords)
            if high_urgency_found:
                urgency_analysis["is_urgent"] = True
                urgency_analysis["urgency_level"] = "high"
                urgency_analysis["response_priority"] = "immediate"
                urgency_analysis["escalation_needed"] = True
                urgency_analysis["estimated_response_time"] = "1h"
                urgency_analysis["urgency_reasons"].append("High urgency keywords detected")
            
            # Check for medium urgency
            elif any(keyword in text_lower for keyword in medium_urgency_keywords):
                urgency_analysis["urgency_level"] = "medium"
                urgency_analysis["response_priority"] = "high"
                urgency_analysis["estimated_response_time"] = "4h"
                urgency_analysis["urgency_reasons"].append("Medium urgency keywords detected")
            
            # Check for time-sensitive language
            time_indicators = [
                "today", "tonight", "morning", "afternoon", "evening",
                "deadline", "due", "time", "schedule", "appointment"
            ]
            
            if any(indicator in text_lower for indicator in time_indicators):
                urgency_analysis["urgency_reasons"].append("Time-sensitive language detected")
                if urgency_analysis["urgency_level"] == "low":
                    urgency_analysis["urgency_level"] = "medium"
                    urgency_analysis["response_priority"] = "high"
                    urgency_analysis["estimated_response_time"] = "4h"
            
            # Check for emotional intensity
            emotional_keywords = [
                "angry", "furious", "upset", "frustrated", "disappointed",
                "terrible", "awful", "horrible", "worst", "unacceptable"
            ]
            
            if any(keyword in text_lower for keyword in emotional_keywords):
                urgency_analysis["urgency_reasons"].append("High emotional intensity detected")
                if urgency_analysis["urgency_level"] == "low":
                    urgency_analysis["urgency_level"] = "medium"
                    urgency_analysis["response_priority"] = "high"
            
            # Check for business impact
            business_keywords = [
                "business", "customer", "client", "meeting", "presentation",
                "important", "critical", "essential", "necessary", "required"
            ]
            
            if any(keyword in text_lower for keyword in business_keywords):
                urgency_analysis["urgency_reasons"].append("Business impact indicated")
            
            return urgency_analysis
            
        except Exception as e:
            logger.error(f"Error in urgency detection: {e}")
            raise e
    
    async def analyze_chat_conversations(self, conversation_data: List[Dict]) -> Dict[str, Any]:
        """Analyze chat conversation quality and patterns"""
        try:
            conversation_analysis = {
                "overall_quality": 0.0,
                "response_time_metrics": {},
                "customer_satisfaction": 0.0,
                "agent_performance": {},
                "conversation_patterns": {},
                "improvement_suggestions": [],
                "sentiment_trend": "neutral"
            }
            
            if not conversation_data:
                return conversation_analysis
            
            # Calculate response times
            response_times = []
            for message in conversation_data:
                if message.get("is_agent") and message.get("timestamp"):
                    # Find previous customer message
                    for prev_message in reversed(conversation_data[:conversation_data.index(message)]):
                        if not prev_message.get("is_agent") and prev_message.get("timestamp"):
                            response_time = message["timestamp"] - prev_message["timestamp"]
                            response_times.append(response_time.total_seconds())
                            break
            
            if response_times:
                conversation_analysis["response_time_metrics"] = {
                    "average_response_time": sum(response_times) / len(response_times),
                    "min_response_time": min(response_times),
                    "max_response_time": max(response_times),
                    "response_time_count": len(response_times)
                }
            
            # Analyze sentiment trends
            sentiments = []
            for message in conversation_data:
                if not message.get("is_agent"):  # Only customer messages
                    if self.sentiment_analyzer:
                        sentiment = self.sentiment_analyzer.polarity_scores(message.get("text", ""))
                        sentiments.append(sentiment['compound'])
            
            if sentiments:
                avg_sentiment = sum(sentiments) / len(sentiments)
                conversation_analysis["customer_satisfaction"] = (avg_sentiment + 1) / 2  # Convert to 0-1 scale
                
                # Determine sentiment trend
                if avg_sentiment > 0.2:
                    conversation_analysis["sentiment_trend"] = "positive"
                elif avg_sentiment < -0.2:
                    conversation_analysis["sentiment_trend"] = "negative"
                else:
                    conversation_analysis["sentiment_trend"] = "neutral"
            
            # Analyze conversation patterns
            pattern_analysis = {
                "message_count": len(conversation_data),
                "customer_messages": len([m for m in conversation_data if not m.get("is_agent")]),
                "agent_messages": len([m for m in conversation_data if m.get("is_agent")]),
                "conversation_duration": 0,
                "resolution_achieved": False
            }
            
            if len(conversation_data) >= 2:
                first_message = conversation_data[0]
                last_message = conversation_data[-1]
                if first_message.get("timestamp") and last_message.get("timestamp"):
                    pattern_analysis["conversation_duration"] = (
                        last_message["timestamp"] - first_message["timestamp"]
                    ).total_seconds()
            
            # Check if resolution was achieved
            resolution_keywords = ["thank you", "thanks", "solved", "resolved", "fixed", "helpful"]
            last_customer_message = None
            for message in reversed(conversation_data):
                if not message.get("is_agent"):
                    last_customer_message = message
                    break
            
            if last_customer_message:
                text_lower = last_customer_message.get("text", "").lower()
                pattern_analysis["resolution_achieved"] = any(
                    keyword in text_lower for keyword in resolution_keywords
                )
            
            conversation_analysis["conversation_patterns"] = pattern_analysis
            
            # Calculate overall quality score
            quality_factors = []
            
            # Response time quality (0-1)
            if response_times:
                avg_response = conversation_analysis["response_time_metrics"]["average_response_time"]
                if avg_response < 60:  # Less than 1 minute
                    quality_factors.append(1.0)
                elif avg_response < 300:  # Less than 5 minutes
                    quality_factors.append(0.8)
                elif avg_response < 900:  # Less than 15 minutes
                    quality_factors.append(0.6)
                else:
                    quality_factors.append(0.3)
            else:
                quality_factors.append(0.5)
            
            # Customer satisfaction quality (0-1)
            quality_factors.append(conversation_analysis["customer_satisfaction"])
            
            # Resolution quality (0-1)
            resolution_quality = 1.0 if pattern_analysis["resolution_achieved"] else 0.5
            quality_factors.append(resolution_quality)
            
            # Conversation efficiency (0-1)
            efficiency = min(1.0, 10 / max(1, pattern_analysis["message_count"]))
            quality_factors.append(efficiency)
            
            # Calculate overall quality
            if quality_factors:
                conversation_analysis["overall_quality"] = sum(quality_factors) / len(quality_factors)
            
            # Generate improvement suggestions
            suggestions = []
            if conversation_analysis["overall_quality"] < 0.7:
                if conversation_analysis["response_time_metrics"].get("average_response_time", 0) > 300:
                    suggestions.append("Improve response time - aim for under 5 minutes")
                
                if conversation_analysis["customer_satisfaction"] < 0.6:
                    suggestions.append("Focus on customer satisfaction - provide more helpful responses")
                
                if not pattern_analysis["resolution_achieved"]:
                    suggestions.append("Ensure customer issues are fully resolved before ending conversation")
                
                if pattern_analysis["message_count"] > 20:
                    suggestions.append("Streamline conversations - aim for efficient issue resolution")
            
            conversation_analysis["improvement_suggestions"] = suggestions
            
            return conversation_analysis
            
        except Exception as e:
            logger.error(f"Error in conversation analysis: {e}")
            raise e
    
    # Helper methods
    def extract_key_phrases(self, text: str) -> List[str]:
        """Extract key phrases from text"""
        try:
            if not self.nlp:
                # Basic key phrase extraction
                words = text.lower().split()
                stop_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"}
                key_phrases = [word for word in words if word not in stop_words and len(word) > 3]
                return key_phrases[:10]  # Return top 10
            
            # Use SpaCy for better key phrase extraction
            doc = self.nlp(text)
            
            # Extract noun chunks and named entities
            key_phrases = []
            
            # Noun chunks
            for chunk in doc.noun_chunks:
                if chunk.text.lower() not in ["i", "you", "it", "this", "that"]:
                    key_phrases.append(chunk.text)
            
            # Named entities
            for ent in doc.ents:
                key_phrases.append(ent.text)
            
            # Remove duplicates and return
            unique_phrases = list(set(key_phrases))
            return unique_phrases[:15]  # Return top 15
            
        except Exception as e:
            logger.warning(f"Error in key phrase extraction: {e}")
            return []
    
    def classify_intent(self, text: str) -> str:
        """Classify intent from text"""
        try:
            text_lower = text.lower()
            
            # Intent classification rules
            intents = {
                "order": ["order", "buy", "get", "want", "need", "deliver", "food", "meal"],
                "support": ["help", "problem", "issue", "trouble", "wrong", "broken", "error"],
                "tracking": ["track", "where", "status", "delivery", "arrival", "location"],
                "payment": ["pay", "payment", "billing", "charge", "refund", "money"],
                "feedback": ["feedback", "review", "rating", "experience", "opinion", "satisfied"],
                "general": ["question", "ask", "wonder", "curious", "information", "how", "what", "when"]
            }
            
            intent_scores = {}
            for intent, keywords in intents.items():
                score = sum(1 for keyword in keywords if keyword in text_lower)
                intent_scores[intent] = score
            
            if intent_scores:
                best_intent = max(intent_scores, key=intent_scores.get)
                if intent_scores[best_intent] > 0:
                    return best_intent
            
            return "general"
            
        except Exception as e:
            logger.warning(f"Error in intent classification: {e}")
            return "general"
    
    def classify_categories(self, text: str) -> List[str]:
        """Classify text into categories"""
        try:
            text_lower = text.lower()
            categories = []
            
            # Category classification rules
            category_keywords = {
                "food_quality": ["taste", "fresh", "hot", "cold", "quality", "delicious", "bland"],
                "delivery_service": ["delivery", "driver", "late", "fast", "slow", "location"],
                "app_technical": ["app", "website", "login", "crash", "error", "bug", "technical"],
                "payment_issue": ["payment", "billing", "charge", "refund", "money", "card"],
                "customer_service": ["service", "support", "help", "rude", "friendly", "staff"],
                "order_accuracy": ["wrong", "missing", "extra", "order", "item", "correct"]
            }
            
            for category, keywords in category_keywords.items():
                if any(keyword in text_lower for keyword in keywords):
                    categories.append(category)
            
            return categories[:3]  # Return top 3 categories
            
        except Exception as e:
            logger.warning(f"Error in category classification: {e}")
            return []
    
    def local_response_generation(self, query: str, context: Dict[str, Any]) -> str:
        """Generate response using local models"""
        try:
            # Simple rule-based response generation
            query_lower = query.lower()
            
            # Common response patterns
            if "order" in query_lower or "food" in query_lower:
                return "I can help you with your order! What would you like to order today?"
            
            elif "delivery" in query_lower or "track" in query_lower:
                return "I can help you track your delivery. Please provide your order number."
            
            elif "payment" in query_lower or "bill" in query_lower:
                return "I can assist you with payment-related questions. What specific payment issue are you experiencing?"
            
            elif "problem" in query_lower or "issue" in query_lower:
                return "I'm sorry to hear you're experiencing an issue. Let me help you resolve it. Can you describe the problem in detail?"
            
            elif "thank" in query_lower:
                return "You're welcome! Is there anything else I can help you with?"
            
            elif "hello" in query_lower or "hi" in query_lower:
                return "Hello! Welcome to our delivery service. How can I assist you today?"
            
            else:
                return "I understand your query. Let me help you with that. Could you please provide more details?"
                
        except Exception as e:
            logger.warning(f"Error in local response generation: {e}")
            return "I'm here to help! How can I assist you today?"
