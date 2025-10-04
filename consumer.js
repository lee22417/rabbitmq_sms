require("dotenv").config();
const amqp = require("amqplib/callback_api");
const aligo = require("aligoapi");
const { send_queue } = require("./producer");

const args = process.argv.slice(2);
const VIRTUAL_HOST = args[0];
const QUEUE_NAME = "sms";
const AMQP_SERVER = process.env.AMQP_SERVER + VIRTUAL_HOST; // AmazonMQ server

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
                  "title": "문자 제목", // sms title
                  "msg": "문자 내용",   // sms content
                  "groupId": "",
                  "reserve": "Y",
                  "rdate": "20260101", // sms 전송일자 yyyymmdd (예약시)
                  "rtime": "1000",     // sms 전송시간 hhss (예약시)
                  "sender": "",        // sms 발신인
                  "receiver": "01012341234", // sms 수신인
                  "testmode_yn": "Y"    // test 여부
                },
                "headers": {
                  "Content-Type": "application/json"
                }
              },
              "recvList": [ // aligo 관련X, log 저장용
                {
                  "recv": "테스트",
                  "number": "01012341234"
                }
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
