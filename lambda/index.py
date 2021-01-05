from __future__ import print_function
import boto3
import json
import os
from boto3.dynamodb.conditions import Key, Attr

minConfidence = 50

def handler(event, context):

  for record in event['Records']:
    ourBucket = record['s3']['bucket']['name']
    ourKey = record['s3']['object']['key']

  rekFunction(ourBucket, ourKey)

  return

def rekFunction(ourBucket, ourKey):

  print('Detected the following image in S3')
  print('Bucket: ' + ourBucket + ' key name: ' + ourKey)

  client = boto3.client('rekognition')

  response = client.detect_labels(Image={'S3Object': {'Bucket':ourBucket, 'Name':ourKey}},
    MaxLabels=10,
    MinConfidence=minConfidence)

  dynamodb = boto3.resource('dynamodb')

  imageLabelsTable = os.environ['TABLE']
  table = dynamodb.Table(imageLabelsTable)

  table.put_item(
    Item={
      'image': ourKey}
    )

  objectsDetected = []

  for label in response['Labels']:
    newItem = label['Name']
    objectsDetected.append(newItem)
    objectNum = len(objectsDetected)
    itemAtt = f"object{objectNum}"
    response = table.update_item(
      Key={
        'image': ourKey
      },
      UpdateExpression=f"set {itemAtt} = :r",
      ExpressionAttributeValues={
        ':r': f"{newItem}"
      },
      ReturnValues="UPDATED_NEW"
    )

  return
