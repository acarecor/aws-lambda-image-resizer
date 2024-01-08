import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";


const s3Client = new S3Client({
    region: "eu-central-1" ,

});

export const handler = async (event) => {
    const record = event.Records[0];
    const bucketName = record.s3.bucket.name;
    const originalPrefix = "original-images/";
    const resizedPrefix = "resized-images/";
    const sourceKey = decodeURIComponent(
      record.s3.object.key.replace(/\+/g, " ")
    );
    const resizedImageKey = sourceKey.startsWith(originalPrefix)
      ? sourceKey.replace(originalPrefix, resizedPrefix)
      : `${resizedPrefix}${sourceKey}`;
  
    // Read data from event object.
    if (!sourceKey)
      return {
        statusCode: 400,
        body: "No key specified",
      };
  
    try {
      //Get image from bucket
      const getS3ImageStream = async (bucketName, key) => {
        const getObjectParams = {
          Bucket: bucketName,
          Key: key,
        };
      
        const getObjectCmd = new GetObjectCommand(getObjectParams);
        const getObjectResponse = await s3Client.send(getObjectCmd);
        return getObjectResponse.Body ;
      };
      const imageStream = await getS3ImageStream(bucketName, sourceKey);
  
      // Resize image
      const resizeImage = async (imageStream) => {
        const resizer = sharp().resize(200);
        const resizedImageBuffer = await imageStream.pipe(resizer).toBuffer();
        return resizedImageBuffer;
      };
      const resizedImageBuffer = await resizeImage(imageStream);
  
      // Put resized image in bucket
      const putS3ImageBuffer = async ( bucketName, buffer, key ) => {
        const putObjectParams = {
          Bucket: bucketName,
          Key: key,
          Body: buffer,
        };
        const putObjectCmd = new PutObjectCommand(putObjectParams);
        const response = await s3Client.send(putObjectCmd);
        console.log("Image resized and uploaded successfully");
        return response;
      };

      await putS3ImageBuffer(bucketName, resizedImageBuffer, resizedImageKey);
  
      return {
        statusCode: 200,
        body: "Image resized and uploaded successfully",
      };
    } catch (error) {
      console.error(error);
      return {
        statusCode: 500,
        body: "An error occurred",
      };
    }
  };
