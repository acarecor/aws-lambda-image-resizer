import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";


const s3Client = new S3Client({
    region: "eu-central-1" ,
});

const OUTPUT_BUCKET = process.env.OUTPUT_BUCKET;

export const handler = async (event) => {
    // Extract information from the S3 event record
    const record = event.Records[0];
    const srcBucket = record.s3.bucket.name;
    
    const Object = record.s3.object;
    const srcPath = decodeURIComponent(
      Object.key.replace(/\+/g, " ")
    );
     // Retrieve the output bucket name from environment variables
    const output_bucket_name = process.env.OUTPUT_BUCKET;

    // Download the original image from the source bucket
    const getObjectParams = {
        Bucket: srcBucket,
        Key: srcPath
    };
    const getObjectCommand = new GetObjectCommand(getObjectParams);
    const originalImage = await s3Client.send(getObjectCommand);
    
    //Resize the image
    const resizedBuffer = await sharp(originalImage.Body).resize(200).toBuffer();
    
    //Upload the resized image to the new bucket
    const newBucketParams = {
        Bucket : OUTPUT_BUCKET,
        Key:srcPath,
        Body:resizedBuffer,
        ContentType: getContentType(srcPath) ,
        ACL: 'public-read'
    };

    // Function to determine the content type based on the file extension
    const getContentType = (filePath)=> {
    const lowerCaseFilePath = filePath.toLowerCase();
     if (lowerCaseFilePath.endsWith('.jpeg') || lowerCaseFilePath.endsWith('.jpg')) {
        return 'image/jpeg';
     } else if (lowerCaseFilePath.endsWith('.png')) {
        return 'image/png';
     } else {
        // Set a default value if it's not JPEG nor PNG
        return 'application/octet-stream';
     }
    }
    // Create and send the PutObjectCommand to upload the resized image
    const putObjectCmd = new PutObjectCommand(newBucketParams);
    await s3Client.send(putObjectCmd);
    
    // Return a success message along with the event
    return { message: 'success', event };
};
