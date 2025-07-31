/**
 * Dog module with various dog-related functions
 */

/**
 * Make a dog say hi with greeting
 * @param greeting - The greeting message
 * @param name - The dog's name
 * @returns Greeting message with dog sounds
 */
export const sayHi = (greeting: string, name: string): string => {
    return `${greeting} ${name} says hi! woof! woof!`;
};

/**
 * Make a dog walk
 * @param name - The dog's name
 * @returns Walking message
 */
export const walk = (name: string): string => {
    return `Dog ${name} is walking and wagging tail`;
};

/**
 * Make a dog fetch something
 * @param name - The dog's name
 * @param item - The item to fetch
 * @returns Fetch message
 */
export const fetch = (name: string, item: string): string => {
    return `Dog ${name} is fetching the ${item}! Good boy!`;
};

/**
 * Make a dog bark
 * @param name - The dog's name
 * @param times - Number of times to bark
 * @returns Barking message
 */
export const bark = (name: string, times: number): string => {
    const barks = 'woof! '.repeat(times || 1);
    return `Dog ${name} is barking: ${barks.trim()}`;
};