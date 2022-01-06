import styles from '../styles/ClientList.module.css'
import spotStyles from '../styles/Spot.module.css'

const ClientList = (props: {listeners?: [{name: string, isHost: boolean, watchingAD: boolean}]}) => {
  return (
    <div className={`${styles.list} ${spotStyles.box}`}>
      {
        props.listeners?.map((client, i) => 
          <div key={i} className={styles.text}>{client.name}
            {client.isHost?
              <span title='Host'>🕹️</span>
            : <></>}
            {client.watchingAD?
              <span title='Watching an AD'>💵</span>
            : <></>}
          </div>
        )
      }
    </div>
  )
}

export default ClientList
