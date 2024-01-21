/*!
    * Start Bootstrap - Material Admin Pro v1.0.6 (https://startbootstrap.com/theme/material-admin-pro)
    * Copyright 2013-2023 Start Bootstrap
    * Licensed under SEE_LICENSE (https://github.com/StartBootstrap/material-admin-pro/blob/master/LICENSE)
    */
window.addEventListener('DOMContentLoaded', event => {
    // Enable tooltips globally
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Enable popovers globally
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Activate Bootstrap scrollspy for the sticky nav component
    const navStick = document.body.querySelector('#navStick');
    if (navStick) {
        new bootstrap.ScrollSpy(document.body, {
            target: '#navStick',
            rootMargin: '0px 0px -45%',
        });
    }

    // Toggle the side navigation
    const drawerToggle = document.body.querySelector('#drawerToggle');
    if (drawerToggle) {
        drawerToggle.addEventListener('click', event => {
            event.preventDefault();
            document.body.classList.toggle('drawer-toggled');
        });
    }

    // Close side navigation when width < LG
    const drawerContent = document.body.querySelector('#layoutDrawer_content');
    if (drawerContent) {
        drawerContent.addEventListener('click', event => {
            const BOOTSTRAP_LG_WIDTH = 992;
            if (window.innerWidth >= 992) {
                return;
            }
            if (document.body.classList.contains("drawer-toggled")) {
                document.body.classList.toggle("drawer-toggled");
            }
        });
    }


    // Add active state to sidbar nav links
    let activatedPath = window.location.pathname.match(/([\w-]+\.html)/, '$1');

    if (activatedPath) {
        activatedPath = activatedPath[0];
    } else {
        activatedPath = 'index.html';
    }

    const targetAnchors = document.body.querySelectorAll('[href="' + activatedPath + '"].nav-link');

    targetAnchors.forEach(targetAnchor => {
        let parentNode = targetAnchor.parentNode;
        while (parentNode !== null && parentNode !== document.documentElement) {
            if (parentNode.classList.contains('collapse')) {
                parentNode.classList.add('show');
                const parentNavLink = document.body.querySelector(
                    '[data-bs-target="#' + parentNode.id + '"]'
                );
                parentNavLink.classList.remove('collapsed');
                parentNavLink.classList.add('active');
            }
            parentNode = parentNode.parentNode;
        }
        targetAnchor.classList.add('active');
    });
});
