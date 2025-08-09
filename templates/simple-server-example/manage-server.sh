#!/bin/bash

# TLDraw Server Management Script
SERVER_NAME="tldraw-server"
SERVER_DIR="/root/dev/tldraw/templates/simple-server-example"
PID_FILE="/tmp/tldraw-server.pid"
LOG_FILE="/tmp/tldraw-server.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Function to check if server is running
is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$PID_FILE"
        fi
    fi
    return 1
}

# Function to get server status
status() {
    print_info "Checking server status..."
    
    if is_running; then
        local pid=$(cat "$PID_FILE")
        print_status "Server is running (PID: $pid)"
        
        # Check if ports are listening
        if ss -tlnp | grep -q ":5858"; then
            print_status "Backend server is listening on port 5858"
        else
            print_warning "Backend server port 5858 not found"
        fi
        
        if ss -tlnp | grep -q ":5757"; then
            print_status "Frontend server is listening on port 5757"
        else
            print_warning "Frontend server port 5757 not found"
        fi
        
        print_info "Access URLs:"
        print_info "  Frontend: https://tldraw.ngx.zw-lab.net"
        print_info "  Backend:  https://tldraw-backend.ngx.zw-lab.net"
        
    else
        print_warning "Server is not running"
    fi
}

# Function to start the server
start() {
    print_info "Starting TLDraw server..."
    
    if is_running; then
        print_warning "Server is already running"
        status
        return 1
    fi
    
    # Change to server directory
    cd "$SERVER_DIR" || {
        print_error "Failed to change to server directory: $SERVER_DIR"
        return 1
    }
    
    # Start the server in background
    print_info "Starting server with yarn dev-node..."
    nohup yarn dev-node > "$LOG_FILE" 2>&1 &
    local pid=$!
    
    # Save PID
    echo "$pid" > "$PID_FILE"
    
    print_status "Server started with PID: $pid"
    print_info "Log file: $LOG_FILE"
    
    # Wait a moment and check status
    sleep 3
    status
}

# Function to stop the server
stop() {
    print_info "Stopping TLDraw server..."
    
    if ! is_running; then
        print_warning "Server is not running"
        return 0
    fi
    
    local pid=$(cat "$PID_FILE")
    
    # Kill the process
    print_info "Stopping process $pid..."
    kill "$pid" 2>/dev/null
    
    # Wait for process to stop
    local count=0
    while ps -p "$pid" > /dev/null 2>&1 && [ $count -lt 10 ]; do
        sleep 1
        count=$((count + 1))
    done
    
    # Force kill if still running
    if ps -p "$pid" > /dev/null 2>&1; then
        print_warning "Force killing process $pid..."
        kill -9 "$pid" 2>/dev/null
    fi
    
    # Remove PID file
    rm -f "$PID_FILE"
    
    print_status "Server stopped"
}

# Function to restart the server
restart() {
    print_info "Restarting TLDraw server..."
    stop
    sleep 2
    start
}

# Function to show logs
logs() {
    if [ -f "$LOG_FILE" ]; then
        print_info "Showing server logs (last 50 lines):"
        echo "----------------------------------------"
        tail -n 50 "$LOG_FILE"
        echo "----------------------------------------"
        print_info "Full log file: $LOG_FILE"
    else
        print_warning "No log file found"
    fi
}

# Function to show help
help() {
    echo "TLDraw Server Management Script"
    echo ""
    echo "Usage: $0 {start|stop|restart|status|logs|help}"
    echo ""
    echo "Commands:"
    echo "  start   - Start the TLDraw server"
    echo "  stop    - Stop the TLDraw server"
    echo "  restart - Restart the TLDraw server"
    echo "  status  - Show server status"
    echo "  logs    - Show server logs"
    echo "  help    - Show this help message"
    echo ""
    echo "Server Configuration:"
    echo "  Frontend: https://tldraw.ngx.zw-lab.net"
    echo "  Backend:  https://tldraw-backend.ngx.zw-lab.net"
    echo "  PID File: $PID_FILE"
    echo "  Log File: $LOG_FILE"
}

# Main script logic
case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    help|--help|-h)
        help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        help
        exit 1
        ;;
esac

exit 0
