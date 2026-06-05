import styles from './Button.module.css';

/**
 * Botón reutilizable con variantes primary y secondary.
 * Acepta un prop `as` para renderizar como otro componente (Link, NavLink, a, etc.).
 *
 * Uso:
 *   <Button variant="primary">Empezar</Button>
 *   <Button variant="secondary" as={Link} to="/contacto">Contacto</Button>
 */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  as: Component = 'button',
  className = '',
  ...props
}) {
  const classes = [styles.button, styles[variant], styles[size], className]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
}

export default Button;
