import SongInfo from '../../backend/web-shared/songInfo'
import styles from '../styles/Song.module.css'
import spotStyles from '../styles/Spot.module.css'

const Song = (props: {song: SongInfo | undefined}) => {
  return (
    <div className={`${styles.song} ${spotStyles.box}`}>
      <img src={props.song?.image || "images/NoSong.png"} className={styles.image}></img>
      <div className={`${styles.text} ${props.song?.paused ? "" : styles.playing}`}>{props.song?.name}</div>
      <img className={`${(props.song?.paused || props.song?.paused===undefined) ? styles.none : ""} ${styles.playingImg}`} src={"images/Playing.gif"}></img>
    </div>
  )
}

export default Song
