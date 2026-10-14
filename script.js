(() => {
  const root = document.documentElement;
  const body = document.body;
  const header = document.querySelector('[data-header]');
  const menu = document.querySelector('[data-menu]');
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const progress = document.querySelector('.scroll-progress span');
  const glow = document.querySelector('[data-cursor-glow]');
  // Hydra's presentation relies on visible motion. Keep site animations enabled even
  // when the OS/browser has 'reduce motion' enabled, which was causing some PCs
  // to skip the count-up and reveal transitions entirely.
  const reduceMotion = false;

  const revealEls = [...document.querySelectorAll('.reveal')];
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); obs.unobserve(entry.target); }
    }), {threshold:.12, rootMargin:'0px 0px -7% 0px'});
    revealEls.forEach(el => observer.observe(el));
  } else revealEls.forEach(el => el.classList.add('is-visible'));

  // Load the latest checked-in public stats, then animate every value clearly from zero.
  // The short hold at 0 makes the count-up visible even when the stats are already in the first viewport.
  const stats = document.querySelector('[data-stats]');
  const statEls = stats ? [...stats.querySelectorAll('[data-count]')] : [];

  const formatStat = (value, el) => {
    const suffix = el.dataset.suffix || '';
    const format = el.dataset.format || 'integer';
    if (format === 'compact') {
      // Keep zero as a real zero instead of "0K", then switch to compact notation while counting.
      if (value < 1000) return `${Math.round(value).toLocaleString('en-US')}${suffix}`;
      const text = new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 1
      }).format(value);
      return text + suffix;
    }
    const decimals = Number(el.dataset.decimals || 0);
    return (decimals ? value.toFixed(decimals) : Math.round(value).toLocaleString('en-US')) + suffix;
  };

  // Put every stat at zero immediately, before any fetch/observer work can finish.
  statEls.forEach(el => { el.textContent = formatStat(0, el); });

  const hydrateStats = async () => {
    if (!stats || stats.dataset.hydrated === 'true') return;
    stats.dataset.hydrated = 'true';

    // Browsers deliberately block fetch() from file:// pages.
    // When the site is opened by double-clicking index.html, keep the
    // fallback values already embedded in the HTML and skip the request.
    if (location.protocol === 'file:') return;

    try {
      const response = await fetch('./data/stats.json', { cache: 'no-store' });
      if (!response.ok) return;
      const latest = await response.json();
      stats.querySelectorAll('[data-stat]').forEach(el => {
        const value = Number(latest[el.dataset.stat]);
        if (Number.isFinite(value)) el.dataset.count = String(value);
      });
    } catch (_) {
      // If hosted stats cannot be reached, the HTML fallback values remain valid
      // and every animation continues to run normally.
    }
  };

  const animateStats = async () => {
    if (!stats || stats.dataset.counted === 'true') return;
    stats.dataset.counted = 'true';
    await hydrateStats();

    if (reduceMotion) {
      statEls.forEach(el => {
        const target = Number(el.dataset.count || 0);
        el.textContent = formatStat(target, el);
      });
      return;
    }

    // Keep the visible 0 state for a moment, then count for long enough to actually notice it.
    await new Promise(resolve => setTimeout(resolve, 900));

    statEls.forEach((el, index) => {
      const target = Number(el.dataset.count || 0);
      const duration = 4200 + index * 220;
      const delay = index * 140;

      setTimeout(() => {
        const startTime = performance.now();
        const tick = now => {
          const t = Math.min(1, (now - startTime) / duration);
          // Smooth ease-out: fast enough at first, but lets the last digits visibly settle.
          const eased = t < .72 ? (t / .72) * .82 : .82 + (1 - Math.pow(1 - ((t - .72) / .28), 2)) * .18;
          el.textContent = formatStat(target * eased, el);
          if (t < 1) requestAnimationFrame(tick);
          else el.textContent = formatStat(target, el);
        };
        requestAnimationFrame(tick);
      }, delay);
    });
  };

  if (stats && 'IntersectionObserver' in window && !reduceMotion) {
    const statObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .22)) {
        animateStats();
        statObserver.disconnect();
      }
    }, { threshold: [.22, .45] });
    statObserver.observe(stats);
  } else animateStats();

  const onScroll = () => {
    const y = scrollY;
    header?.classList.toggle('scrolled', y > 28);
    const max = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.width = `${max > 0 ? Math.min(100, y / max * 100) : 0}%`;
  };
  addEventListener('scroll', onScroll, {passive:true}); onScroll();

  menuToggle?.addEventListener('click', () => {
    const open = !body.classList.contains('menu-open');
    body.classList.toggle('menu-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
  });
  menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    body.classList.remove('menu-open'); menuToggle?.setAttribute('aria-expanded','false');
  }));

  if (!reduceMotion && glow && matchMedia('(pointer:fine)').matches) {
    addEventListener('pointermove', e => {
      glow.style.transform = `translate(${e.clientX - 190}px, ${e.clientY - 190}px)`;
    }, {passive:true});
  }

  const tilt = document.querySelector('[data-tilt-lite]');
  if (!reduceMotion && tilt && matchMedia('(pointer:fine)').matches) {
    tilt.addEventListener('pointermove', e => {
      const r = tilt.getBoundingClientRect(), x = (e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
      tilt.style.transform = `perspective(700px) rotateX(${-y*5}deg) rotateY(${x*5}deg) translateY(-2px)`;
    });
    tilt.addEventListener('pointerleave', () => tilt.style.transform='');
  }

  // A tiny mouse-reactive lift for the contact link rows — intentionally subtle.
  if (!reduceMotion && matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('.contact-link').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
        card.style.transform = `perspective(600px) rotateX(${-y*2}deg)`;
      });
      card.addEventListener('pointerleave', () => card.style.transform='');
    });
  }

  document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
  const links=[...document.querySelectorAll('.main-nav a[href^="#"]')];
  const sections=links.map(link=>({link,section:document.querySelector(link.getAttribute('href'))})).filter(x=>x.section);
  if ('IntersectionObserver' in window && sections.length) {
    const visible=new Map();
    const navObs=new IntersectionObserver(entries=>{
      entries.forEach(entry=>visible.set(entry.target.id,entry.intersectionRatio));
      let best=null; sections.forEach(item=>{const ratio=visible.get(item.section.id)||0;if(!best||ratio>best.ratio)best={...item,ratio};});
      if(!best||best.ratio<=0)return; links.forEach(link=>link.classList.toggle('is-active',link===best.link));
    },{rootMargin:'-18% 0px -58% 0px',threshold:[0,.1,.25,.5,.75,1]});
    sections.forEach(({section})=>navObs.observe(section));
  }
})();

/* Ambient background — a quiet, twinkling starfield with an occasional
   shooting star, in the site's own cyan palette. Deliberately sparse:
   this reads as atmosphere, not decoration, and stays distinct from a
   connected "network" look — just stars, drifting and blinking slowly. */
(() => {
  const canvas=document.querySelector('[data-particle-field]'); if(!canvas)return;
  const ctx=canvas.getContext('2d');
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w=0,h=0,dpr=1,stars=[],shooters=[],raf=0,nextShooter=0;
  const pointer={x:0,y:0,tx:0,ty:0};

  function resize(){
    dpr=Math.min(devicePixelRatio||1,2);
    w=innerWidth;h=innerHeight;
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    canvas.style.width=w+'px';canvas.style.height=h+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const count=w<700?46:Math.min(110,Math.round(w/16));
    stars=Array.from({length:count},()=>({
      x:Math.random()*w,y:Math.random()*h,
      vx:(Math.random()-.5)*.05,vy:(Math.random()-.5)*.04,
      r:.6+Math.random()*1.5,
      bright:Math.random()<.22,
      phase:Math.random()*Math.PI*2,
      speed:.6+Math.random()*.9
    }));
  }

  function spawnShooter(){
    const fromTop=Math.random()<.7;
    const x=fromTop?Math.random()*w*.7:-40;
    const y=fromTop?-40:Math.random()*h*.4;
    const angle=(35+Math.random()*20)*Math.PI/180; // down-right diagonal
    const speed=9+Math.random()*6;
    shooters.push({
      x,y,
      vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
      life:0,maxLife:46+Math.random()*18,
      len:70+Math.random()*60
    });
  }

  function frame(t){
    ctx.clearRect(0,0,w,h);
    pointer.x+=(pointer.tx-pointer.x)*.03;
    pointer.y+=(pointer.ty-pointer.y)*.03;
    const px=pointer.x*14, py=pointer.y*10;

    // twinkling stars
    stars.forEach(s=>{
      if(!reducedMotion){
        s.x+=s.vx;s.y+=s.vy;
        if(s.x<-10)s.x=w+10; if(s.x>w+10)s.x=-10;
        if(s.y<-10)s.y=h+10; if(s.y>h+10)s.y=-10;
      }
      const twinkle=reducedMotion?.7:(.5+Math.sin(t*.001*s.speed+s.phase)*.5);
      ctx.globalAlpha=(s.bright?.65:.32)*twinkle+.06;
      ctx.fillStyle=s.bright?'#8deaff':'#56dcff';
      ctx.beginPath();
      ctx.arc(s.x+px*.3,s.y+py*.3,s.r,0,Math.PI*2);
      ctx.fill();
    });

    // shooting stars
    if(!reducedMotion){
      if(t>nextShooter){
        spawnShooter();
        nextShooter=t+4200+Math.random()*5200;
      }
      shooters.forEach(s=>{
        s.x+=s.vx;s.y+=s.vy;s.life++;
        const fade=1-s.life/s.maxLife;
        if(fade<=0)return;
        const tailX=s.x-s.vx*(s.len/Math.hypot(s.vx,s.vy));
        const tailY=s.y-s.vy*(s.len/Math.hypot(s.vx,s.vy));
        const grad=ctx.createLinearGradient(s.x,s.y,tailX,tailY);
        grad.addColorStop(0,`rgba(232,252,255,${.85*fade})`);
        grad.addColorStop(.4,`rgba(86,220,255,${.5*fade})`);
        grad.addColorStop(1,'rgba(86,220,255,0)');
        ctx.strokeStyle=grad;
        ctx.lineWidth=1.6;
        ctx.beginPath();
        ctx.moveTo(s.x,s.y);
        ctx.lineTo(tailX,tailY);
        ctx.stroke();
      });
      shooters=shooters.filter(s=>s.life<s.maxLife && s.x<w+120 && s.y<h+120);
    }

    ctx.globalAlpha=1;
    if(!reducedMotion) raf=requestAnimationFrame(frame);
  }

  addEventListener('pointermove',e=>{
    pointer.tx=(e.clientX/Math.max(1,w)-.5)*2;
    pointer.ty=(e.clientY/Math.max(1,h)-.5)*2;
  },{passive:true});
  addEventListener('resize',resize,{passive:true});

  resize();
  cancelAnimationFrame(raf);
  nextShooter=performance.now()+1400;
  frame(reducedMotion?0:performance.now()); // one static frame under reduced motion, an animation loop otherwise
})();


/* Hero petals — three depth layers of falling pixel petals over the night-castle
   render. Sharp little rectangles (no curves) that "flip" as they fall, to match
   the voxel look. Far + mid layers draw under the scrim, the large soft near layer
   draws over the content. */
(() => {
  const hero=document.querySelector('.hx-banner'); if(!hero)return;
  const back=hero.querySelector('[data-petals="back"]');
  const front=hero.querySelector('[data-petals="front"]');
  if(!back||!front)return;
  const ctxB=back.getContext('2d'), ctxF=front.getContext('2d');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PALETTE=['#ffd0ec','#ff8fcf','#ff6fb8','#e85aa6','#c98bff'];
  const rnd=(a,b)=>a+Math.random()*(b-a);
  const pick=a=>a[(Math.random()*a.length)|0];

  let w=0,h=0,dpr=1,petals=[],running=false,visible=true,last=0,raf=0;

  // size = px, vy = fall speed px/s, count = [desktop, mobile]
  const LAYERS=[
    {name:'far', ctx:ctxB, count:[36,16], size:[2,4],   alpha:[.35,.6],  vy:[16,30],   blur:0},
    {name:'mid', ctx:ctxB, count:[30,14], size:[6,10],  alpha:[.7,.95],  vy:[38,64],   blur:0},
    {name:'near',ctx:ctxF, count:[6,3],   size:[11,18], alpha:[.45,.65], vy:[110,160], blur:12}
  ];

  function make(layer,scatter){
    const s=rnd(layer.size[0],layer.size[1]);
    return {
      layer, s,
      long:Math.random()<.45,                 // some petals are 1×2 voxels
      x:rnd(-140,w), y:scatter?rnd(-40,h):rnd(-120,-20),
      vy:rnd(layer.vy[0],layer.vy[1]),
      wind:rnd(8,26)*(layer.name==='near'?1.8:1),
      amp:rnd(10,38), freq:rnd(.6,1.5), phase:rnd(0,6.28),
      flip:rnd(1.2,3.2), fphase:rnd(0,6.28),
      color:pick(PALETTE), alpha:rnd(layer.alpha[0],layer.alpha[1])
    };
  }

  function resize(){
    const r=hero.getBoundingClientRect();
    dpr=Math.min(devicePixelRatio||1,2);
    w=Math.max(1,Math.round(r.width)); h=Math.max(1,Math.round(r.height));
    [back,front].forEach(c=>{c.width=Math.round(w*dpr);c.height=Math.round(h*dpr)});
    ctxB.setTransform(dpr,0,0,dpr,0,0); ctxF.setTransform(dpr,0,0,dpr,0,0);
    const small=w<700?1:0;
    petals=[];
    LAYERS.forEach(l=>{for(let i=0;i<l.count[small];i++)petals.push(make(l,true))});
  }

  function draw(t){
    ctxB.clearRect(0,0,w,h); ctxF.clearRect(0,0,w,h);
    for(const p of petals){
      const c=p.layer.ctx;
      const pw=Math.max(1,Math.round(p.s*(.3+.7*Math.abs(Math.cos(t*p.flip+p.fphase)))*(p.long?1.9:1)));
      const ph=Math.max(1,Math.round(p.s*(.55+.45*Math.abs(Math.sin(t*p.flip*.7+p.phase)))));
      c.globalAlpha=p.alpha; c.fillStyle=p.color;
      if(p.layer.blur){c.shadowColor=p.color;c.shadowBlur=p.layer.blur*dpr}
      c.fillRect(Math.round(p.x),Math.round(p.y),pw,ph);
      if(p.layer.blur)c.shadowBlur=0;
    }
    ctxB.globalAlpha=1; ctxF.globalAlpha=1;
  }

  function frame(now){
    if(!running)return;
    const dt=Math.min(.05,(now-last)/1000||0); last=now;
    const t=now/1000;
    for(const p of petals){
      p.y+=p.vy*dt;
      p.x+=(p.wind+Math.sin(t*p.freq+p.phase)*p.amp)*dt;
      if(p.y>h+40||p.x>w+60){const n=make(p.layer,false);Object.assign(p,n)}
    }
    draw(t);
    raf=requestAnimationFrame(frame);
  }

  function start(){if(running||reduced||!visible||document.hidden)return;running=true;last=performance.now();raf=requestAnimationFrame(frame)}
  function stop(){running=false;cancelAnimationFrame(raf)}

  new ResizeObserver(()=>{resize();draw(0)}).observe(hero);
  resize(); draw(0);                      // under reduced motion this stays a single still frame
  if('IntersectionObserver' in window)new IntersectionObserver(es=>{visible=es[0].isIntersecting;visible?start():stop()},{threshold:0}).observe(hero);
  document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
  start();
})();
