// Performance monitoring utility
class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  startTimer(name) {
    if (!this.isDevelopment) return;
    
    if (this.metrics[name]) {
      console.warn(`Timer "${name}" already exists. Creating new timer with timestamp.`);
      name = `${name}-${Date.now()}`;
    }
    
    this.metrics[name] = {
      startTime: performance.now(),
      name
    };
    
    console.time(name);
  }

  endTimer(name) {
    if (!this.isDevelopment) return;
    
    if (!this.metrics[name]) {
      console.warn(`Timer "${name}" not found.`);
      return;
    }
    
    const endTime = performance.now();
    const duration = endTime - this.metrics[name].startTime;
    
    console.timeEnd(name);
    
    // Store metric for analysis
    this.metrics[name].endTime = endTime;
    this.metrics[name].duration = duration;
    
    // Log slow operations
    if (duration > 100) {
      console.warn(`⚠️ Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }
    
    delete this.metrics[name];
  }

  logMetric(name, value) {
    if (!this.isDevelopment) return;
    console.log(`📊 ${name}:`, value);
  }

  getMetrics() {
    return this.metrics;
  }

  clearMetrics() {
    this.metrics = {};
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor; 