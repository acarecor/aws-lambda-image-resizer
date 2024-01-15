require('dotenv').config();
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";


const s3Client = new S3Client({
    region: "eu-central-1" ,
});


export const handler = async (event) => {
    
    const record = event.Records[0];
    const srcBucket = record.s3.bucket.name;
    
    const Object = record.s3.object;
    const srcPath = decodeURIComponent(
      Object.key.replace(/\+/g, " ")
    );
    const output_bucket_name = process.env.OUTPUT_BUCKET_NAME;

    //Dowload image
    const getObjectParams = {
        Bucket: srcBucket,
        Key: srcPath
    };
    const getObjectCommand = new GetObjectCommand(getObjectParams);
    const originalImage = await s3Client.send(getObjectCommand);
    
    //Resize
    const resizedBuffer = await sharp(originalImage.Body).resize(200).toBuffer();
    
    //Upload to new bucket
    const newBucketParams = {
        Bucket : output_bucket_name,
        Key:srcPath,
        Body:resizedBuffer,
        ContentType: getContentType(srcPath) ,
        ACL: 'public-read'
    };

    // Función para determinar el tipo de contenido basado en la extensión del archivo
    const getContentType = (filePath)=> {
    const lowerCaseFilePath = filePath.toLowerCase();
     if (lowerCaseFilePath.endsWith('.jpeg') || lowerCaseFilePath.endsWith('.jpg')) {
        return 'image/jpeg';
     } else if (lowerCaseFilePath.endsWith('.png')) {
        return 'image/png';
     } else {
        // Establecer un valor predeterminado si no es JPEG ni PNG
        return 'application/octet-stream';
     }
    }
    
    const putObjectCmd = new PutObjectCommand(newBucketParams);
    await s3Client.send(putObjectCmd);
    

    return { message: 'success', event };
};