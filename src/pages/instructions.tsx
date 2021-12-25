import { NextPage } from "next";
import config from "../../config";
import styles from '../styles/Index.module.css'
import stylesInst from '../styles/Instructions.module.css'
import spotStyles from '../styles/Spot.module.css'

const Instructions: NextPage = () => {
  const releaseURL = `https://github.com/FlafyDev/spotify-listen-together/releases/download/v${config.clientRecommendedVersion}`
  const listenTogetherURL = `${releaseURL}/listenTogether.js`
  const windowsInstallURL = `${releaseURL}/windows-listen-together-install.ps1`
  const windowsInstallCMD = `Invoke-WebRequest -UseBasicParsing "${windowsInstallURL}" | Invoke-Expression`

  return (
    <div className="main">
      <div className={styles.contentContainer}>
        <br />
        <div className={styles.header}>Install Spotify Listen Together</div>
        <br /><br />
        <div className={styles.header+" "+styles.left}>Automatic Windows install</div>
        <br />
        <div className={styles.text+" "+styles.left}>
          1. Press WIN + R<br/>
          2. Type &quot;Powershell&quot; and press ENTER<br/>
          3. Paste:
        </div>
        <br />
        <div className={spotStyles.box+" "+styles.code} onClick={(e) => {
          navigator.clipboard.writeText(windowsInstallCMD)
          
          if (window.getSelection) {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(e.currentTarget);
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        }}>
          {windowsInstallCMD}
        </div>
        <br /><br />
        <div className={styles.header+" "+styles.left}>Manual install</div>
        <br />
        <div className={styles.text+" "+styles.left}>
          1. Download and install <a href="https://spicetify.app/docs/getting-started/installation">Spicetify</a>.<br/>
          2. Download <a href={listenTogetherURL}>listenTogether.js</a>.<br/>
          3. Paste &quot;listenTogether.js&quot; in &quot;.../.spicetify/Extensions&quot; (find the folder &quot;.spicetify&quot; by typing &quot;spicetify -c&quot; in Powershell).<br/>
          4. Run &quot;spicetify config extensions listenTogether.js&quot; and &quot;spicetify backup apply&quot;.<br/>
        </div>
      </div>
    </div>
  )
}

export default Instructions