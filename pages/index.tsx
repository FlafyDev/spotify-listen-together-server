import type { NextPage } from 'next'
import Header from '../components/header'
import Song from '../components/song'
import styles from '../styles/Index.module.css'

const Index: NextPage = () => {
  return <div className={styles.main}>
    <Header></Header>
    <Song name="All star" image="https://i.ytimg.com/vi/WUz2Goi2eHs/hqdefault.jpg"></Song>
  </div>
}

export default Index
