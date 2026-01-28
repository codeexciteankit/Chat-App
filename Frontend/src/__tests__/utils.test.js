import { describe, it, expect } from 'vitest';
import { 
  sanitizeText, 
  generateUUID, 
  isValidEmail,
  formatFileSize,
  validateImage
} from '../lib/utils';

describe('Utils Functions', () => {
  describe('sanitizeText', () => {
    it('should escape HTML entities', () => {
      const input = '<script>alert("XSS")</script>';
      const result = sanitizeText(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('should handle normal text', () => {
      const input = 'Hello world!';
      const result = sanitizeText(input);
      expect(result).toBe('Hello world!');
    });

    it('should escape special characters', () => {
      const input = '<div onclick="badStuff()">Click me</div>';
      const result = sanitizeText(input);
      expect(result).not.toContain('onclick');
      expect(result).toContain('&lt;div');
    });
  });

  describe('generateUUID', () => {
    it('should generate a valid UUID', () => {
      const uuid = generateUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name+tag@example.co.uk')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test @example.com')).toBe(false);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });
  });

  describe('validateImage', () => {
    it('should reject non-image files', () => {
      const mockFile = new File([''], 'test.txt', { type: 'text/plain' });
      const result = validateImage(mockFile);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should accept image files', () => {
      const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(mockFile, 'size', { value: 1024 * 1024 }); // 1MB
      const result = validateImage(mockFile);
      expect(result.valid).toBe(true);
    });
  });
});
