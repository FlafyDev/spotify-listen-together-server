import "dotenv-defaults/config"

export default {
  hostPassword: process.env.HOST_PASSWORD!,
  maxDelay: parseInt(process.env.MAX_DELAY!),
  port: parseInt(process.env.PORT!),
}
