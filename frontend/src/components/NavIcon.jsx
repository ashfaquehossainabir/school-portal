const PATHS = {
  overview: (
    <>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="13" y="3.5" width="7.5" height="4.8" rx="1.6" />
      <rect x="13" y="10.3" width="7.5" height="10.2" rx="1.6" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.6" />
    </>
  ),
  directory: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20c0-3.6 2.5-6 5.5-6s5.5 2.4 5.5 6" />
      <circle cx="17" cy="7.5" r="2.3" />
      <path d="M15.5 12.3c2.6.2 4.7 2.4 4.9 6.2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.7 2.7-6.3 6-6.3s6 2.6 6 6.3" />
      <path d="M17 4.3c1.6.4 2.8 1.9 2.8 3.7s-1.2 3.3-2.8 3.7" />
      <path d="M17.5 13.8c2.1.6 3.7 2.9 3.9 6.2" />
    </>
  ),
  classes: (
    <>
      <path d="M4 20V9.3L12 4l8 5.3V20" />
      <path d="M4 20h16" />
      <path d="M9.5 20v-6h5v6" />
      <path d="M9.5 11h.01M14.5 11h.01" />
    </>
  ),
  attendance: (
    <>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2.4" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v3M16 3v3" />
      <path d="M7.5 14l2.4 2.4L16.5 12" />
    </>
  ),
  exams: (
    <>
      <path d="M6 3.5h9l4 4V20.5H6z" />
      <path d="M15 3.5v4h4" />
      <path d="M9 12.5h6M9 15.8h6M9 9.3h3" />
    </>
  ),
  routine: (
    <>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2.4" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v3M16 3v3" />
      <path d="M7.7 13h2v2h-2zM12 13h2v2h-2zM16.3 13h1.7" />
    </>
  ),
  notes: (
    <>
      <path d="M5 4.5h11.5L19 7v12.5H5z" />
      <path d="M15.5 4.5V8H19" />
      <path d="M8 11.5h7M8 14.7h7M8 17.9h4" />
    </>
  ),
  notices: (
    <>
      <path d="M4 10.2v3.6c0 .9.7 1.6 1.6 1.6H7L13.5 20V4L7 8.6H5.6C4.7 8.6 4 9.3 4 10.2z" />
      <path d="M17 9.3c1 .8 1.6 1.9 1.6 2.7s-.6 2-1.6 2.7" />
      <path d="M9.5 16.4l1 3.6" />
    </>
  ),
  fees: (
    <>
      <rect x="3.5" y="6" width="17" height="13" rx="2" />
      <path d="M3.5 10.5h17" />
      <path d="M7 14h3M7 16.5h5" />
      <circle cx="16.5" cy="15" r="2.1" />
      <path d="M9 6V4.6c0-.6.5-1.1 1.1-1.1h3.8c.6 0 1.1.5 1.1 1.1V6" />
    </>
  ),
  logout: (
    <>
      <path d="M14.5 8V6a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" />
      <path d="M9.5 12h11" />
      <path d="M17.5 8.5l3.5 3.5-3.5 3.5" />
    </>
  ),
};

export default function NavIcon({ name, size = 18 }) {
  const path = PATHS[name];
  if (!path) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}
