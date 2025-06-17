// jest.setup.js
import '@testing-library/jest-dom'; // Extends Jest with DOM matchers

// jest-fetch-mock setup
import fetchMock from 'jest-fetch-mock';
fetchMock.enableMocks(); // Enable fetch mocking globally

// Polyfill for TextEncoder and TextDecoder
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
