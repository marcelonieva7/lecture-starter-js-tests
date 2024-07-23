const path = require('path')

describe('CartParser - unit tests', () => {
	let parser;
	const CartParser = require('./CartParser').default;
	const idGenerator = require('uuid');
	const readFileSync = require('fs').readFileSync;

	jest.mock('uuid', () => ({
		v4: jest.fn()
	}));
	
	jest.mock('fs', () => ({
		readFileSync: jest.fn()
	}));
		
	beforeEach(() => {
		parser = new CartParser();
		idGenerator.v4.mockReturnValue('1234-5678-9101');
	});
	
	test('should read file content', () => {
		readFileSync.mockReturnValue('Product name,Price,Quantity\nApple,1.00,2');
		const result = parser.readFile('/path/to/file.csv');

		expect(result).toBe('Product name,Price,Quantity\nApple,1.00,2');
		expect(readFileSync).toHaveBeenCalledWith('/path/to/file.csv', 'utf-8', 'r');
	});

	test('should throw error when file not found', () => {
		readFileSync.mockImplementation(() => {
			throw new Error('File not found');
		});
		expect(() => parser.readFile('./samples/nonexistent.csv')).toThrow('File not found');
	});

	test('should validate correct CSV content', () => {
		const contents = 'Product name,Price,Quantity\nApple,1.00,2';
		const errors = parser.validate(contents);
		expect(errors).toHaveLength(0);
	});
	
	test('should generate error for incorrect header', () => {
		const contents = 'Product,Price,Quantity\nApple,1.00,2';
		const errors = parser.validate(contents);
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toBe('Expected header to be named "Product name" but received Product.');
	});
	
	test('should generate error for missing cell', () => {
		const contents = 'Product name,Price,Quantity\nApple,1.00';
		const errors = parser.validate(contents);
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toBe('Expected row to have 3 cells but received 2.');
	});

	test('should generate multiple errors', () => {
		const contents = 'Product,Price,Quantity\nApple,,2';
		const errors = parser.validate(contents);
		const [ error1, error2 ] = errors;

		expect(errors).toHaveLength(2);
		expect(error1).toMatchObject({
			type: 'header',
			row: 0,
			column: 0,
			message: 'Expected header to be named "Product name" but received Product.'
		});
		expect(error2).toMatchObject({
			type: 'row',
			row: 1,
			column: -1,
			message: 'Expected row to have 3 cells but received 2.'
		});
	});

	test('should generate error for negative number cell', () => {
		const contents = 'Product name,Price,Quantity\nApple,-1,2';
		const errors = parser.validate(contents);
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toBe('Expected cell to be a positive number but received "-1".');
	});	
	
	test('should parse a valid line', () => {
		const csvLine = 'Apple,1.00,2';
		const result = parser.parseLine(csvLine);
		expect(result).toEqual({ name: 'Apple', price: 1, quantity: 2, id: '1234-5678-9101' });
	});
	
	test('should calculate total price', () => {
		const items = [
			{ name: 'Apple', price: 1, quantity: 2 },
			{ name: 'Banana', price: 0.5, quantity: 3 }
		];
		const total = parser.calcTotal(items);
		expect(total).toBe(3.5);
	});
	
	test('should throw error for invalid CSV during parse', () => {
		readFileSync.mockReturnValue('Product name,Price,Quantity\nApple,abc,2');
		expect(() => parser.parse('/path/to/file.csv')).toThrow('Validation failed!');
	});
	
	test('should parse valid CSV and return JSON object', () => {
		readFileSync.mockReturnValue('Product name,Price,Quantity\nApple,1.00,2');
		const result = parser.parse('/path/to/file.csv');
		expect(result).toEqual({
			items: [{ name: 'Apple', price: 1, quantity: 2, id: '1234-5678-9101' }],
			total: 2
		});
	});
});

