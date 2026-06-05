import styles from './Footer.module.css';

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <p className={styles.copy}>
          &copy; {year} Innova Trabajo Social. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
