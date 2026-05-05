package pe.edu.utec.queueless.pedido.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utec.queueless.pedido.entity.ItemPedido;

public interface ItemPedidoRepository extends JpaRepository<ItemPedido, Long> {
}
