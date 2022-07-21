import fs from "fs";
import {
  PublishCommand,
  SNSClient,
} from "@aws-sdk/client-sns";

(async () => {
  const configName = "config.json";
  const totalMessage = 1
  const region = process.env.REGION || "sa-east-1";
  const snsClient = new SNSClient({ region: region });

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

  const publishSns = async (message) => {
    const params = {
      TopicArn: config.sns.TopicArn,
      Message: message,
    };
    try {
      const { MessageId } = await snsClient.send(new PublishCommand(params));
      console.log("MessageId", MessageId);
      return MessageId;
    } catch (err) {
      console.log("Error", err.stack);
    }
  };
for (let i = 0; i < totalMessage; i++) {
  await publishSns(`publicando mensagem ${i}`);
}
})();
