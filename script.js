document.getElementById('year').textContent = new Date().getFullYear();

    const menuToggle = document.getElementById('menuToggle');
    const menuClose = document.getElementById('menuClose');
    const sideDrawer = document.getElementById('sideDrawer');
    const menuBackdrop = document.getElementById('menuBackdrop');

    function openMenu(){
      sideDrawer.classList.add('open');
      menuBackdrop.classList.add('show');
      menuToggle.setAttribute('aria-expanded', 'true');
      sideDrawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeMenu(){
      sideDrawer.classList.remove('open');
      menuBackdrop.classList.remove('show');
      menuToggle.setAttribute('aria-expanded', 'false');
      sideDrawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    menuToggle.addEventListener('click', openMenu);
    menuClose.addEventListener('click', closeMenu);
    menuBackdrop.addEventListener('click', closeMenu);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
