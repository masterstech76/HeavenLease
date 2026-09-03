package com.heavenlease.service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest;
import software.amazon.awssdk.services.dynamodb.model.GetItemResponse;
import software.amazon.awssdk.services.dynamodb.model.ReturnValue;
import software.amazon.awssdk.services.dynamodb.model.UpdateItemRequest;

/**
 * Real AWS DynamoDB integration for lightweight, high-speed counters and
 * analytics (property view counts). This is a <b>secondary</b> NoSQL store;
 * the core relational data (users, properties, bookings, payments) lives in
 * the main Database (PostgreSQL / AWS RDS).
 *
 * <p>DynamoDB is optional. When AWS keys are not configured, every call fails
 * gracefully (returns 0 / no-op) so the app keeps working.</p>
 */
@Service
public class DynamoDBService {

    @Value("${aws.dynamodb.table-name}")
    private String tableName;

    private final DynamoDbClient dynamoDbClient;

    public DynamoDBService(DynamoDbClient dynamoDbClient) {
        this.dynamoDbClient = dynamoDbClient;
    }

    public void incrementPropertyViewCount(Long propertyId) {
        try {
            Map<String, AttributeValue> key = new HashMap<>();
            key.put("HeavenLease", AttributeValue.builder().s("property_" + propertyId).build());
            key.put("HL", AttributeValue.builder().s("view_count").build());
            Map<String, AttributeValue> expressionAttributeValues = new HashMap<>();
            expressionAttributeValues.put(":inc", AttributeValue.builder().n("1").build());
            UpdateItemRequest request = UpdateItemRequest.builder()
                    .tableName(tableName).key(key)
                    .updateExpression("ADD viewCount :inc")
                    .expressionAttributeValues(expressionAttributeValues)
                    .returnValues(ReturnValue.UPDATED_NEW).build();
            dynamoDbClient.updateItem(request);
        } catch (DynamoDbException | SdkClientException e) {
            System.err.println("DynamoDB incrementPropertyViewCount failed: " + e.getMessage());
        }
    }

    public long getPropertyViewCount(Long propertyId) {
        try {
            Map<String, AttributeValue> key = new HashMap<>();
            key.put("HeavenLease", AttributeValue.builder().s("property_" + propertyId).build());
            key.put("HL", AttributeValue.builder().s("view_count").build());
            GetItemRequest request = GetItemRequest.builder().tableName(tableName).key(key).build();
            GetItemResponse response = dynamoDbClient.getItem(request);
            if (response.hasItem() && response.item().containsKey("viewCount")) {
                return Long.parseLong(response.item().get("viewCount").n());
            }
        } catch (DynamoDbException | SdkClientException e) {
            System.err.println("DynamoDB getPropertyViewCount failed: " + e.getMessage());
        }
        return 0;
    }
}