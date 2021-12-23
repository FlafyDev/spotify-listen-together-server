import styles from '../styles/Song.module.css'

const Song = (props: {name: string, image?: string}) => {
  const img = props.image ? props.image : "/NoSong.png"
  return (
    <div className={styles.song}>
      <img src={img} className={styles.image}></img>
      <div className={styles.text}>{props.name}</div>
    </div>
  )
}

export default Song
