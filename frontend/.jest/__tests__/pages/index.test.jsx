import '@jestRoot/__mocks__/services.mock';
import '@jestRoot/__mocks__/context.mock';
import Index from '@pages/index';
import { render, screen, act, waitFor, within } from '@testing-library/react'
import { AppWrapper } from '@contexts/app.context';
import { useRouter } from 'next/router'
jest.mock('next/router', () => ({
    __esModule: true,
    useRouter: jest.fn()
  }))

describe('Index', () => {
    let container;
    const mockRouter = {
        push: jest.fn()
      }
    beforeEach(async () => {
        useRouter.mockReturnValue(mockRouter)
        container = render( 
            <AppWrapper>
                <Index  />
            </AppWrapper>
        )
    });

    it('renders Index and checks if router push was called', () => {
        expect(mockRouter.push).toBeCalledWith('example')
    })
})