#!/usr/bin/env node

/**
 * Port Conflict Resolution Script for ZipzyDeliver
 * Helps identify and resolve port conflicts
 */

import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

// Port ranges to check
const PORT_RANGES = {
  HTTP: { start: 3000, end: 3010, name: 'Frontend Server' },
  HMR: { start: 24679, end: 24700, name: 'Hot Module Replacement' },
  WEBSOCKET: { start: 24678, end: 24690, name: 'WebSocket Server' },
  API: { start: 5000, end: 5010, name: 'Backend API' }
};

/**
 * Check what's using a specific port
 */
async function checkPortUsage(port) {
  try {
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    if (stdout.trim()) {
      const lines = stdout.trim().split('\n');
      const processes = [];
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const pid = parts[4];
          try {
            const { stdout: taskOutput } = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV`);
            const taskLine = taskOutput.split('\n')[1];
            if (taskLine) {
              const taskParts = taskLine.split(',');
              const processName = taskParts[0].replace(/"/g, '');
              processes.push({ pid, name: processName });
            }
          } catch (error) {
            processes.push({ pid, name: 'Unknown' });
          }
        }
      }
      
      return processes;
    }
    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Kill a process by PID
 */
async function killProcess(pid) {
  try {
    await execAsync(`taskkill /PID ${pid} /F`);
    console.log(`✅ Killed process ${pid}`);
    return true;
  } catch (error) {
    console.log(`❌ Failed to kill process ${pid}: ${error.message}`);
    return false;
  }
}

/**
 * Find available ports in a range
 */
async function findAvailablePorts(start, end) {
  const available = [];
  
  for (let port = start; port <= end; port++) {
    try {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      if (!stdout.trim()) {
        available.push(port);
      }
    } catch (error) {
      available.push(port);
    }
  }
  
  return available;
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 ZipzyDeliver Port Conflict Resolution\n');
  
  for (const [service, range] of Object.entries(PORT_RANGES)) {
    console.log(`📡 Checking ${range.name} (Ports ${range.start}-${range.end})...`);
    
    const conflicts = [];
    for (let port = range.start; port <= range.end; port++) {
      const processes = await checkPortUsage(port);
      if (processes.length > 0) {
        conflicts.push({ port, processes });
      }
    }
    
    if (conflicts.length > 0) {
      console.log(`   ❌ Conflicts found:`);
      for (const conflict of conflicts) {
        console.log(`      Port ${conflict.port}:`);
        for (const process of conflict.processes) {
          console.log(`        - PID ${process.pid}: ${process.name}`);
        }
      }
    } else {
      console.log(`   ✅ No conflicts found`);
    }
    
    const available = await findAvailablePorts(range.start, range.end);
    console.log(`   🆓 Available ports: ${available.join(', ')}\n`);
  }
  
  console.log('💡 Resolution Options:');
  console.log('   1. Kill conflicting processes manually');
  console.log('   2. Use available ports from the list above');
  console.log('   3. Run the application - it will automatically find available ports');
  console.log('   4. Use: npm run dev (will auto-resolve ports)');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { checkPortUsage, killProcess, findAvailablePorts };

