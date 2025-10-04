require("dotenv").config();
const amqp = require("amqplib/callback_api");

const args = process.argv.slice(2);
const VIRTUAL_HOST = args[0];
const AMQP_SERVER = process.env.AMQP_SERVER + VIRTUAL_HOST;

exports.send_queue = async (queue_name, data) => {
  amqp.connect(AMQP_SERVER, (error0, connection) => {
    if (error0) {
      console.log(error0);
      throw error0;
    }
    connection.createChannel((error1, channel1) => {
      if (error1) {
        throw error1;
      }

      channel1.assertQueue(queue_name, {});

      channel1.sendToQueue(queue_name, Buffer.from(JSON.stringify(data)));

      console.log(" [x] Sent %s", JSON.stringify(data));

      return 0;
    });
  });
};
