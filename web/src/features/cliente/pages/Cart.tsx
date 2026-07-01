import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { http, endpoints } from '@/api';
import { useAsyncAction, useToast } from '@/hooks';
import { usePageChrome } from '@/components/layout';
import { Button, Card, EmptyState, Field, Icon, Segmented, Select, Stepper, StateBanner } from '@/components/ui';
import { zodResolver } from '@/lib/form';
import { formatSoles } from '@/lib/format';
import { paths } from '@/routes/paths';
import { TIPO_ENTREGA_LABELS } from '@/types';
import type { CrearPedidoRequest, ItemPedidoRequest, PedidoResponse } from '@/types';
import { useCart } from '../cart/useCart';
import { BackLink, CartSummary, FoodThumb } from '../components';
import { checkoutSchema, ZONAS, type CheckoutValues } from '../schemas';

export default function Cart() {
  const cart = useCart();
  const navigate = useNavigate();
  const toast = useToast();
  usePageChrome('Tu carrito', { maxWidth: 640 });

  const {
    control,
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { tipoEntrega: 'PICKUP', zonaEntrega: '', recojoProgramadoAt: '' },
  });

  const tipoEntrega = watch('tipoEntrega');

  const crearPedido = useAsyncAction(async (values: CheckoutValues) => {
    const items: ItemPedidoRequest[] = cart.lines.map((line) => ({
      productoId: line.producto.id,
      cantidad: line.cantidad,
    }));
    const body: CrearPedidoRequest = {
      puntoDeVentaId: cart.vendor!.id,
      tipoEntrega: values.tipoEntrega,
      zonaEntrega: values.tipoEntrega === 'DELIVERY' ? values.zonaEntrega : null,
      recojoProgramadoAt: values.recojoProgramadoAt
        ? new Date(values.recojoProgramadoAt).toISOString()
        : null,
      items,
    };
    return http.post<PedidoResponse>(endpoints.cliente.pedidos.base, body);
  });

  // los 400 de validacion traen errores por campo; los pintamos en el formulario
  useEffect(() => {
    const err = crearPedido.error;
    if (err?.kind === 'validation') {
      for (const [field, message] of Object.entries(err.fieldErrorMap)) {
        setError(field as keyof CheckoutValues, { message });
      }
    }
  }, [crearPedido.error, setError]);

  const onSubmit = handleSubmit(async (values) => {
    const pedido = await crearPedido.run(values);
    if (pedido) {
      cart.clear();
      toast.success('Pedido creado. Continúa con el pago.');
      navigate(paths.cliente.pago(pedido.id));
    }
  });

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
        <BackLink to={paths.cliente.home} />
        <EmptyState
          icon="shoppingBag"
          title="Tu carrito está vacío"
          description="Explora los puntos de venta del campus y arma tu pedido."
          action={
            <Link to={paths.cliente.home}>
              <Button icon="store">Ver locales</Button>
            </Link>
          }
        />
      </div>
    );
  }

  // mensaje de negocio (422) o conflicto, que mostramos tal cual lo manda el backend
  const banner =
    crearPedido.error && crearPedido.error.kind !== 'validation' ? crearPedido.error.message : null;

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
      <BackLink to={paths.cliente.home} />

      <p className="text-small text-ink-soft">
        de <span className="font-bold text-ink">{cart.vendor?.nombre}</span>
      </p>

      <div className="flex flex-col gap-2.5">
        {cart.lines.map((line) => (
          <Card key={line.producto.id} pad="sm" className="flex items-center gap-3">
            <FoodThumb src={line.producto.fotoUrl} alt={line.producto.nombre} size={48} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-small font-semibold text-ink">{line.producto.nombre}</div>
              <span className="text-small tabular-nums text-ink-soft">
                {formatSoles(line.producto.precio * line.cantidad)}
              </span>
            </div>
            <Stepper value={line.cantidad} onChange={(qty) => cart.setQty(line.producto.id, qty)} min={0} max={20} />
            <button
              type="button"
              onClick={() => cart.remove(line.producto.id)}
              aria-label="Quitar"
              className="grid h-8 w-8 place-items-center rounded-button text-ink-muted transition-colors hover:text-ink"
            >
              <Icon name="x" size={16} />
            </button>
          </Card>
        ))}
      </div>

      {banner && (
        <StateBanner tone="warning" title="No se pudo crear el pedido">
          {banner}
        </StateBanner>
      )}

      <div className="flex flex-col gap-2">
        <span className="ql-section-label">¿Cómo lo recibes?</span>
        <Controller
          control={control}
          name="tipoEntrega"
          render={({ field }) => (
            <Segmented
              value={field.value}
              onChange={field.onChange}
              full
              options={[
                { value: 'PICKUP', label: TIPO_ENTREGA_LABELS.PICKUP },
                { value: 'DELIVERY', label: TIPO_ENTREGA_LABELS.DELIVERY },
              ]}
            />
          )}
        />
      </div>

      {tipoEntrega === 'DELIVERY' && (
        <Select
          label="Zona de entrega"
          placeholder="Elige una zona del campus"
          options={[...ZONAS]}
          error={errors.zonaEntrega?.message}
          {...register('zonaEntrega')}
        />
      )}

      <Card>
        <Field
          label="Programar recojo (opcional)"
          type="datetime-local"
          help="Déjalo vacío para pedir lo antes posible."
          error={errors.recojoProgramadoAt?.message}
          {...register('recojoProgramadoAt')}
        />
      </Card>

      <CartSummary
        subtotal={cart.total}
        total={cart.total}
        entregaLabel={tipoEntrega === 'DELIVERY' ? 'Entrega comunitaria' : 'Recojo en tienda'}
      />

      <StateBanner tone="info">
        Una vez que el comercio acepte tu pedido, no podrás cancelar ni recibir reembolso automático.
      </StateBanner>

      <Button full icon="check" loading={crearPedido.loading} onClick={onSubmit}>
        Confirmar pedido
      </Button>
    </div>
  );
}
