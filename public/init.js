// xCloud Storage - Initialization Script
// This script handles page load and ensures proper authentication flow

// Check if CSS and JS loaded properly
window.addEventListener('load', function() {
    console.log('Page loaded');
    
    // Force show login screen if main content is visible
    const mainContent = document.getElementById('mainContent');
    const loginScreen = document.getElementById('loginScreen');
    
    // Always hide main content initially
    if (mainContent) {
        mainContent.style.display = 'none';
        mainContent.classList.remove('authenticated');
    }
    
    // Always show login screen initially
    if (loginScreen) {
        loginScreen.style.display = 'flex';
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
                    // Fallback: clear localStorage and show login
                    localStorage.removeItem('xcloud_api_key');
                    const mainContent = document.getElementById('mainContent');
                    const loginScreen = document.getElementById('loginScreen');
                    if (mainContent) mainContent.style.display = 'none';
                    if (loginScreen) loginScreen.style.display = 'flex';
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
    
    // Check if CSS loaded properly
    setTimeout(function() {
        const body = document.body;
        const computedStyle = window.getComputedStyle(body);
        
        // If background is still default (white/transparent), CSS didn't load
        if (computedStyle.backgroundColor === 'rgba(0, 0, 0, 0)' || 
            computedStyle.backgroundColor === 'rgb(255, 255, 255)') {
            console.log('CSS not loaded, applying fallback styles');
            body.style.background = 'linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 50%, #0f0f0f 100%)';
            body.style.color = '#ffffff';
            body.style.minHeight = '100vh';
        }
    }, 100);
});
