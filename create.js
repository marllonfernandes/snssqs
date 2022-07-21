import fs from "fs";
import {
  SQSClient,
  CreateQueueCommand,
  GetQueueAttributesCommand,
  SetQueueAttributesCommand,
} from "@aws-sdk/client-sqs";
import {
  CreateTopicCommand,
  SubscribeCommand,
  SNSClient
} from "@aws-sdk/client-sns";

(async () => {
  const region = process.env.REGION || "sa-east-1";
  const snsClient = new SNSClient({ region: region });
  const sqsClient = new SQSClient({ region: region });

  const config = {
    sns: { TopicArn: null, SubscriptionArn: null },
    sqs: { QueueUrl: null, QueueArn: null },
  };

  const createTopic = async () => {
    const params = { Name: "demo" }; //TOPIC_NAME
    try {
      const data = await snsClient.send(new CreateTopicCommand(params));
      config.sns.TopicArn = data.TopicArn;
      return data.TopicArn;
    } catch (err) {
      console.log("Error", err.stack);
    }
  };

  const createQueue = async () => {
    const params = {
      QueueName: "demo",
    };
    const command = new CreateQueueCommand(params);
    try {
      const data = await sqsClient.send(command);
      config.sqs.QueueUrl = data.QueueUrl;
      const { QueueArn } = await getQueueAttr();
      config.sqs.QueueArn = QueueArn;
      return data;
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

  const snsSubscribe = async () => {
    const params = {
      TopicArn: config.sns.TopicArn,
      Protocol: "sqs",
      Endpoint: config.sqs.QueueArn,
    };
    try {
      const { SubscriptionArn } = await snsClient.send(
        new SubscribeCommand(params)
      );
      config.sns.SubscriptionArn = SubscriptionArn;
      return SubscriptionArn;
    } catch (err) {
      console.log("Error", err.stack);
    }
  };

  const setQueueAttr = async () => {
    const queueUrl = config.sqs.QueueUrl;
    const topicArn = config.sns.TopicArn;
    const sqsArn = config.sqs.QueueArn;

    const attributes = {
      Version: "2008-10-17",
      Id: sqsArn + "/SQSDefaultPolicy",
      Statement: [
        {
          Sid: "Sid" + new Date().getTime(),
          Effect: "Allow",
          Principal: {
            AWS: "*",
          },
          Action: "SQS:SendMessage",
          Resource: sqsArn,
          Condition: {
            ArnEquals: {
              "aws:SourceArn": topicArn,
            },
          },
        },
      ],
    };

    const params = {
      QueueUrl: queueUrl,
      Attributes: {
        Policy: JSON.stringify(attributes),
      },
    };

    const command = new SetQueueAttributesCommand(params);
    try {
      const data = await sqsClient.send(command);
      return data.Attributes;
    } catch (err) {
      console.log("Error", err.stack);
    }
  };

  await createTopic();
  await createQueue();
  await snsSubscribe();
  await setQueueAttr();

  await fs.writeFileSync("config.json", JSON.stringify(config));

  console.log(config);

})();
