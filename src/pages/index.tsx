import type { NextPage } from 'next'
import Link from 'next/link'
import { Router, useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import SongInfo from '../../backend/web-shared/songInfo'
import config from '../../config'
import ClientList from '../components/clientList'
import Header from '../components/header'
import Song from '../components/song'
import styles from '../styles/Index.module.css'

const Index: NextPage = () => {
  const router = useRouter();
  const [songInfo, setSongInfo] = useState<SongInfo | undefined>(undefined)
  const [clients, setClients] = useState<any>([])
  
  useEffect(() => {
    const socket = io()
    socket.on("songInfo", (songInfo: SongInfo) => setSongInfo(songInfo))
    socket.on("listeners", (clients: any) => setClients(clients))
    socket.on("connect", () => {
      console.log("connected!")
      socket.emit("requestSongInfo")
      socket.emit("requestListeners")
    })
  }, [])

  return <div className="main">
    <Header></Header>
    <div className={styles.contentContainer}>
      <br/>
      <div className={styles.header}>Your friends are currently listening to...</div>
      <br/>
      <Song song={songInfo}></Song>
      <br/><br/><br/>
      <div className={styles.header}>Who&apos;s listening?</div>
      <br/>
      <ClientList listeners={clients}></ClientList>
      <br/><br/><br/>
      <button className={styles.button} onClick={() => {
        window.open(`spotify:listentogether:${encodeURIComponent(typeof location !== 'undefined' ? location.protocol + '//' + location.host : "")}`, '_self')
      }}>Listen with them!</button>
      <br/>
      <Link href="/instructions" passHref>
        <button className={styles.button + " " + styles.subButton}>Download</button>
      </Link>
      <br/><br/><br/>
    </div>
    <div className={styles.footer}>
      <a href='https://github.com/FlafyDev/spotify-listen-together'>
        <img src='/images/Github.png' width={64}></img>
      </a>
      <label>Made by <a href='https://github.com/FlafyDev'>FlafyDev</a></label>
      <label>Recommended client v{config.clientRecommendedVersion}</label>
    </div>
  </div>
}

export default Index
