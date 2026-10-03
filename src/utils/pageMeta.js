import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://www.teamgenesisvitc.in';

const DEFAULT_META = {
  title: 'Team Genesis | Humanoid Robotics Team of VIT Chennai',
  description:
    'Team Genesis is the student humanoid robotics team of VIT Chennai, designing and building bipedal humanoid robots across mechanical, electrical, and software and AI disciplines.',
};

// Per-route title and description. Keep in sync with public/sitemap.xml.
const ROUTE_META = {
  '/': DEFAULT_META,
  '/robo-hi': {
    title: 'Meet the Team | Team Genesis VIT Chennai',
    description:
      'Meet the people behind Team Genesis, the humanoid robotics team of VIT Chennai, and explore our mechanical, electrical, software and AI, and leadership departments.',
  },
  '/team/leads': {
    title: 'Leads | Team Genesis VIT Chennai',
    description:
      'The leads of Team Genesis, VIT Chennai, who connect ideas, people, and departments to drive humanoid robot development.',
  },
  '/team/mechanical': {
    title: 'Mechanical and Design | Team Genesis VIT Chennai',
    description:
      'The Mechanical and Design department of Team Genesis, VIT Chennai, building the structure, actuation, and CAD of our humanoid robots.',
  },
  '/team/electrical': {
    title: 'Electrical and Control Systems | Team Genesis VIT Chennai',
    description:
      'The Electrical and Control Systems department of Team Genesis, VIT Chennai, designing power, embedded electronics, and motor control for our humanoid robots.',
  },
  '/team/software': {
    title: 'Software and AI | Team Genesis VIT Chennai',
    description:
      'The Software and AI department of Team Genesis, VIT Chennai, developing perception, locomotion control, and embodied AI for our humanoid robots.',
  },
};

function setMeta(selector, attr, value) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

export function usePageMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
    const meta = ROUTE_META[path] || DEFAULT_META;
    const url = `${SITE_URL}${path === '/' ? '/' : path}`;

    document.title = meta.title;
    setMeta('meta[name="description"]', 'content', meta.description);
    setMeta('link[rel="canonical"]', 'href', url);
    setMeta('meta[property="og:title"]', 'content', meta.title);
    setMeta('meta[property="og:description"]', 'content', meta.description);
    setMeta('meta[property="og:url"]', 'content', url);
    setMeta('meta[name="twitter:title"]', 'content', meta.title);
    setMeta('meta[name="twitter:description"]', 'content', meta.description);
  }, [pathname]);
}
