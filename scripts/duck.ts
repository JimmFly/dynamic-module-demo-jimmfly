/**
 * Duck module with various duck-related functions
 */

/**
 * Make a duck say hi with greeting
 * @param greeting - The greeting message
 * @param name - The duck's name
 * @returns Greeting message with duck sounds
 */
export const sayHi = (greeting: string, name: string): string => {
    return `${greeting} ${name} says hi! duck! duck!`;
};

/**
 * Make a duck walk
 * @param name - The duck's name
 * @returns Walking message
 */
export const walk = (name: string): string => {
    return `Duck ${name} is walking`;
};

/**
 * Make a duck swim
 * @param name - The duck's name
 * @param location - Where the duck swims
 * @returns Swimming message
 */
export const swim = (name: string, location: string): string => {
    return `Duck ${name} is swimming in the ${location}`;
};

/**
 * Make a duck quack
 * @param name - The duck's name
 * @param times - Number of times to quack
 * @returns Quacking message
 */
export const quack = (name: string, times: number): string => {
    const quacks = 'quack! '.repeat(times || 1);
    return `Duck ${name} is quacking: ${quacks.trim()}`;
};