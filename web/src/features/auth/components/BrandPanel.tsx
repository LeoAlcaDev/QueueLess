import { Link } from 'react-router-dom';
import { Icon, type IconName } from '@/components/ui';
import { paths } from '@/routes/paths';

// Lockup de la marca en blanco, para que se lea sobre el naranja del panel. El Logo de la
// base usa los colores de tinta y marca, que no contrastan bien sobre fondo solido.
function BrandLockup() {
  return (
    <span className="inline-flex items-center gap-2.5 text-on-brand">
      <svg width={34} height={34} viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <circle cx="28" cy="28" r="20" stroke="currentColor" strokeWidth="5" />
        <path
          d="M40 36 L34 48 L42 48 L36 60 L52 44 L44 44 L50 36 Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[24px] font-bold tracking-[-0.02em]">QueueLess</span>
    </span>
  );
}

const VENTAJAS: { icon: IconName; texto: string }[] = [
  { icon: 'shoppingBag', texto: 'Pide y paga desde el celu' },
  { icon: 'qrCode', texto: 'Recoge con tu QR, sin colas' },
  { icon: 'users', texto: 'Entrega comunitaria entre compañeros' },
  { icon: 'bolt', texto: 'Gana QueuePoints ayudando' },
];

// Anillos sueltos como textura de fondo, sin gradiente. Van detras del contenido y no
// reciben clicks. La mascara radial los desvanece hacia afuera para que queden como un halo
// tenue arriba y no compitan con el eslogan.
function Rings() {
  return (
    <div
      className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_55%_at_50%_30%,#000,transparent_72%)]"
      aria-hidden="true"
    >
      {[520, 380, 240].map((tamano) => (
        <span
          key={tamano}
          className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 rounded-pill border border-on-brand/12"
          style={{ width: tamano, height: tamano }}
        />
      ))}
    </div>
  );
}

// Columna naranja de la izquierda en las pantallas de acceso. Solo aparece en pantallas
// anchas; en mobile cada pantalla muestra su propio logo arriba del formulario.
export function BrandPanel() {
  return (
    <div className="relative hidden w-[460px] shrink-0 flex-col justify-between overflow-hidden bg-brand-strong p-12 text-on-brand lg:flex">
      <Rings />

      <div className="relative">
        <Link to={paths.landing} aria-label="Volver al inicio" className="inline-flex transition-opacity hover:opacity-90">
          <BrandLockup />
        </Link>
      </div>

      <div className="relative">
        <h1 className="max-w-[340px] text-[38px] font-bold leading-[1.1] tracking-[-0.02em]">
          Pide, paga y recoge sin colas
        </h1>
        <p className="mt-3 max-w-[320px] text-[16px] leading-relaxed opacity-90">
          Tu almuerzo del campus, sin la fila. Pre-ordena, paga y recoge con tu código QR.
        </p>
        <ul className="mt-7 space-y-3.5">
          {VENTAJAS.map(({ icon, texto }) => (
            <li key={texto} className="flex items-center gap-3 text-[15px] font-medium">
              <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-pill bg-on-brand/20">
                <Icon name={icon} size={19} />
              </span>
              {texto}
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-small opacity-80">UTEC · Campus Barranco</p>
    </div>
  );
}
