import SongInfo from '../../backend/web-shared/songInfo'
import styles from '../styles/Song.module.css'
import spotStyles from '../styles/Spot.module.css'
import Image from 'next/image'

const Song = (props: {song: SongInfo | undefined}) => {
  return (
    <div className={`${styles.song} ${spotStyles.box}`}>
      <Image src={props.song?.image || "images/NoSong.png"} className={styles.image}></Image>
      <div className={`${styles.text} ${props.song?.paused ? "" : styles.playing}`}>{props.song?.name}</div>
      <Image className={`${(props.song?.paused || props.song?.paused===undefined) ? styles.none : ""} ${styles.playingImg}`} src={"images/Playing.gif"}></Image>
    </div>
  )
}

export default Song
