import { getMe } from '@services/user-service';

import {
    user,
} from './data.mock.js';

jest.mock('@services/user-service', () => {
    const originalModule = jest.requireActual('@services/user-service');
    return {
        // __esModule: true,
        ...originalModule,
        getMe: jest.fn(),
    }
});

getMe.mockImplementation(() => Promise.resolve(user));