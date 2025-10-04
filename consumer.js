require("dotenv").config();
const amqp = require("amqplib/callback_api");
const aligo = require("aligoapi");
const { send_queue } = require("./producer");

const args = process.argv.slice(2);
const VIRTUAL_HOST = args[0];
const QUEUE_NAME = "sms";
const AMQP_SERVER = process.env.AMQP_SERVER + VIRTUAL_HOST;

// aligo key
const AUTHDATA = {
  key: process.env.ALIGO_KEY,
  user_id: process.env.ALIGO_ID,
};

exports.consume_queue = async () => {
  amqp.connect(AMQP_SERVER, function (error0, connection) {
    if (error0) {
      console.log(error0);
      throw error0;
    }
    connection.createChannel(async function (error1, channel) {
      if (error1) {
        throw error1;
      }

      channel.assertQueue(QUEUE_NAME, {
        // durable: true,
      });

      console.log(
        " [*] Waiting for messages in %s %s. To exit press CTRL+C",
        VIRTUAL_HOST,
        QUEUE_NAME
      );

      // queue consume
      channel.consume(QUEUE_NAME, async (data) => {
        const dataContent = JSON.parse(data.content.toString());
        console.log(" [x] Received %s", dataContent);

        /*
          {
            "name": "sms",
            "data": {
              "req": { // aligo request 
                "body": {
                  "title": "문자 제목",
                  "msg": "문자 내용",
                  "groupId": "",
                  "reserve": "Y",
                  "targetMatch": "",
                  "rdate": "20260101",
                  "rtime": "1000",
                  "sender": "",
                  "receiver": "01012341234",
                  "testmode_yn": "Y"
                },
                "headers": {
                  "Content-Type": "application/json"
                }
              },
              "recvList": [ // sms receiver
                "01012341234"
              ],
            }
          }
        */

        if (dataContent.req && dataContent.recvList) {
          const req = dataContent.req;
          const result = await aligo.send(req, AUTHDATA); // aligo send sms 

          if (!result) {
            logger.info(`SendMsg ERROR! ${result}`);
          } else {
            const log = {
              req: req,
              response: result,
              list: dataContent.recvList,
              send_type: dataContent.send_type ?? "",
              send_msg_type: dataContent.send_msg_type ?? "",
            };

            // sms log 저장을 위해 'sms log 저장 queue'에 전송
            // console.log(log);
            await send_queue("sms-log", { data: log });
          }
        }

        channel.ack(data);
      });
    });
  });
};

this.consume_queue();
