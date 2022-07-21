import fs from "fs";
import {
  SQSClient,
  ReceiveMessageCommand,
  GetQueueAttributesCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import {
  CreateTopicCommand,
  SubscribeCommand,
  SNSClient,
} from "@aws-sdk/client-sns";

(async () => {
  const configName = "config.json";
  const region = process.env.REGION || "sa-east-1";
  const snsClient = new SNSClient({ region: region });
  const sqsClient = new SQSClient({ region: region });

  if (await !fs.existsSync(configName)) {
    console.log(`Não foi encontrado o arquivo ${configName}`);
    return;
  }

  const config = JSON.parse(
    await fs.readFileSync(configName, {
      encoding: "utf8",
      flag: "r",
    })
  );

  const deleteMessage = async (receiptHandle) => {
    const params = {
      QueueUrl: config.sqs.QueueUrl,
      ReceiptHandle: receiptHandle,
    };
    try {
      const data = await sqsClient.send(new DeleteMessageCommand(params));
      console.log(`Deleted: ${data["$metadata"].httpStatusCode}`);
      return data['$metadata'].httpStatusCode
    } catch (err) {
      console.log("Error", err.stack);
    }
  };
  
  const getMessages = async () => {
    const params = {
      QueueUrl: config.sqs.QueueUrl,
      MaxNumberOfMessages: 10,
    };
    try {
      const data = await sqsClient.send(
        new ReceiveMessageCommand(params)
      );
      return data.Messages ? data.Messages : [];
    } catch (err) {
      console.log("Error", err.stack);
    }
  };

  const getQueueAttr = async () => {
    const params = {
      QueueUrl: config.sqs.QueueUrl,
      AttributeNames: ["All"],
    };
    const command = new GetQueueAttributesCommand(params);
    try {
      const data = await sqsClient.send(command);
      return data.Attributes;
    } catch (err) {
      console.log("Error", err.stack);
    }
  };
  
  const getReceiveMessage = async () => {
    
    try {
     const attributes = await getQueueAttr()
     const numberOfMessage = Number(attributes.ApproximateNumberOfMessages);
     
     let allMessages = [];
     let running = true;

     while (running) {
       let messages = await getMessages();
       for (let i = 0; i < messages.length; i++) {
         let el = messages[i];
         let encontrou = allMessages.indexOf((el) => el.MessageId);
         if (encontrou === -1) {
           allMessages.push(el);
         }
       }

       const discoveredMessageCount = allMessages.length;

       // await new Promise((resolve) => setTimeout(resolve, 1000));
       running = discoveredMessageCount !== numberOfMessage;
     }
     return allMessages;
    } catch (err) {
      console.log("Error", err.stack);
    }
  };

  // exclui as mensagens na fila
  const allMessages = await getReceiveMessage();
  for (const message of allMessages) {
    await deleteMessage(message.ReceiptHandle)
  }

})();
