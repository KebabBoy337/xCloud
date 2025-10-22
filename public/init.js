// xCloud Storage - Initialization Script
// This script handles page load and ensures proper authentication flow

// Check if CSS and JS loaded properly
window.addEventListener('load', function() {
    console.log('Page loaded');
    
    // Force show login screen if main content is visible
    const mainContent = document.getElementById('mainContent');
    const loginScreen = document.getElementById('loginScreen');
    
    if (mainContent && mainContent.style.display !== 'none') {
        console.log('Hiding main content, showing login');
        mainContent.style.display = 'none';
        if (loginScreen) loginScreen.style.display = 'flex';
    }
    
    // Check if xcloud object exists and initialize
    if (window.xcloud) {
        console.log('xCloud object found, initializing...');
        // Force check authentication status
        window.xcloud.checkAuthStatus();
    } else {
        console.log('xCloud object not found, retrying...');
        // Retry after a short delay
        setTimeout(function() {
            if (window.xcloud) {
                window.xcloud.checkAuthStatus();
            } else {
                console.error('xCloud object still not found');
            }
        }, 100);
    }
});

// Fallback for when external resources fail to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    
    // Check if main content is visible and hide it
    const mainContent = document.getElementById('mainContent');
    const loginScreen = document.getElementById('loginScreen');
    
    if (mainContent && mainContent.style.display !== 'none') {
        console.log('Hiding main content on DOM load');
        mainContent.style.display = 'none';
        if (loginScreen) loginScreen.style.display = 'flex';
    }
});
