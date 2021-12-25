import styles from '../styles/ClientList.module.css'
import spotStyles from '../styles/Spot.module.css'

const ClientList = (props: {clients?: string[]}) => {
  return (
    <div className={`${styles.list} ${spotStyles.box}`}>
      {
        props.clients?.map((client, i) => 
          <div key={i} className={styles.text}>{client}</div>
        )
      }
    </div>
  )
}

export default ClientList
