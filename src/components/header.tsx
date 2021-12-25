import styles from '../styles/Header.module.css'

const Header = () => {
  return (
    <div className={styles.mainTextContainer}>
      <div className={styles.mainText}>Spotify <span className={styles.specialText}>Listen Together</span></div>
    </div>
  )
}

export default Header
