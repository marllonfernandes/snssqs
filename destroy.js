import fs from "fs";
import { SQSClient, DeleteQueueCommand } from "@aws-sdk/client-sqs";
import {
  SNSClient,
  DeleteTopicCommand,
  UnsubscribeCommand,
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

  const deleteTopic = async () => {
    const params = { TopicArn: config.sns.TopicArn };
    try {
      const data = await snsClient.send(new DeleteTopicCommand(params));
      console.log("Success.", data);
      return data; // For unit tests.
    } catch (err) {
      console.log("Error", err.stack);
    }
  };

  const deleteTopicSubscribe = async () => {
    const params = { SubscriptionArn: config.sns.SubscriptionArn };
    try {
      const data = await snsClient.send(new UnsubscribeCommand(params));
      console.log("Success.", data);
      return data; // For unit tests.
    } catch (err) {
      console.log("Error", err.stack);
    }
  };

  const deleteQueue = async () => {
    const params = { QueueUrl: config.sqs.QueueUrl };
    try {
      const data = await sqsClient.send(new DeleteQueueCommand(params));
      console.log("Success.", data);
      return data; // For unit tests.
    } catch (err) {
      console.log("Error", err.stack);
    }
  };

  await deleteTopic();
  await deleteQueue();
  await deleteTopicSubscribe();

  await fs.unlinkSync(configName);
})();
