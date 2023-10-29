
const { Kafka } = require('kafkajs')

const kafka = new Kafka({
  clientId: 'bot-database',
  brokers: ['kafka1:9092', 'kafka2:9092'],
})


async function producer(){
    const producer = kafka.producer()

    await producer.connect()
    await producer.send({
      topic: 'bot-database',
      messages: [
        { value: 'Hello KafkaJS user!' },
      ],
    })
    
    await producer.disconnect()
}


async function consumer(){
    const consumer = kafka.consumer({ groupId: 'bot-database' })

    await consumer.connect()
    await consumer.subscribe({ topic: 'bot-database', fromBeginning: true })
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        console.log({
          value: message.value.toString(),
        })
      },
    })
}


async function main(){

    

}
consumer()

producer()
