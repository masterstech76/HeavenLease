package com.heavenlease.controller;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.heavenlease.model.Property;
import com.heavenlease.repository.PropertyRepository;
import com.heavenlease.service.DynamoDBService;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@SuppressWarnings("unused")
class PropertyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PropertyRepository propertyRepository;

    @MockBean
    private DynamoDBService dynamoDBService;

    private Property testProperty;

    @BeforeEach
    void initTestData() {
        testProperty = new Property();
        testProperty.setId(1L);
        testProperty.setTitle("Test Apartment");
        testProperty.setOwnerId(1L);
        testProperty.setCity("Bengaluru");
        testProperty.setRentAmount(25000.0);
        testProperty.setDeposit(50000.0);
        testProperty.setBhk(2);
        testProperty.setPropertyType("apartment");
        testProperty.setPetFriendly(true);
        testProperty.setFurnished(true);
        testProperty.setQuietness(80);
        testProperty.setSunlight(85);
        testProperty.setCommute(70);
        testProperty.setStatus("active");
        testProperty.setIcon("fa-building");
        testProperty.setBadge("Verified Owner");
    }

    @Test
    @SuppressWarnings("null")
    void getAllProperties_shouldReturnPage() throws Exception {
        List<Property> propertyList = Arrays.asList(testProperty);
        Page<Property> properties = new PageImpl<>(propertyList);
        // Controller calls findAll(PageRequest.of(page, size)); match any pageable
        when(propertyRepository.findAll(any(Pageable.class))).thenReturn(properties);

        mockMvc.perform(get("/api/properties"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].title").value("Test Apartment"))
                .andExpect(jsonPath("$.content[0].city").value("Bengaluru"));
    }

    @Test
    void getProperty_shouldReturnProperty() throws Exception {
        when(propertyRepository.findById(1L)).thenReturn(Optional.of(testProperty));
        when(dynamoDBService.getPropertyViewCount(1L)).thenReturn(42L);

        mockMvc.perform(get("/api/properties/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Test Apartment"))
                .andExpect(jsonPath("$.rentAmount").value(25000.0))
                .andExpect(jsonPath("$.viewCount").value(42));

        verify(dynamoDBService).incrementPropertyViewCount(1L);
    }

    @Test
    void getProperty_shouldReturn404WhenNotFound() throws Exception {
        when(propertyRepository.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/properties/999"))
                .andExpect(status().isNotFound());
    }
}