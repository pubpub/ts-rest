/* eslint-disable @typescript-eslint/no-unused-vars */
import { z } from 'zod';
import {
  initContract,
  ContractOtherResponse,
  ContractPlainType,
  ContractPlainTypeRuntimeSymbol,
} from './dsl';
import type { Equal, Expect } from './test-helpers';

const c = initContract();

describe('contract', () => {
  it('should be typed correctly', () => {
    const contract = c.router({
      getPost: {
        method: 'GET',
        path: '/posts/:id',
        responses: {
          200: z.object({
            id: z.number(),
          }),
        },
      },
    });

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          getPost: {
            method: 'GET';
            path: '/posts/:id';
            responses: {
              200: z.ZodObject<
                {
                  id: z.ZodNumber;
                },
                'strip',
                z.ZodTypeAny,
                {
                  id: number;
                },
                {
                  id: number;
                }
              >;
            };
          };
        }
      >
    >;
  });

  it('should be typed correctly with nested routers', () => {
    const contract = c.router({
      posts: {
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          responses: {
            200: z.object({
              id: z.number(),
            }),
          },
        },
      },
    });

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          posts: {
            getPost: {
              method: 'GET';
              path: '/posts/:id';
              responses: {
                200: z.ZodObject<
                  {
                    id: z.ZodNumber;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    id: number;
                  },
                  {
                    id: number;
                  }
                >;
              };
            };
          };
        }
      >
    >;
  });

  it('should be typed correctly with headers', () => {
    const contract = c.router({
      posts: {
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          responses: {
            200: z.object({
              id: z.number(),
            }),
          },
          headers: z.object({
            'x-foo': z.string(),
          }),
        },
      },
    });

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          posts: {
            getPost: {
              method: 'GET';
              path: '/posts/:id';
              responses: {
                200: z.ZodObject<
                  {
                    id: z.ZodNumber;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    id: number;
                  },
                  {
                    id: number;
                  }
                >;
              };
              headers: z.ZodObject<
                { 'x-foo': z.ZodString },
                'strip',
                z.ZodTypeAny,
                { 'x-foo': string },
                { 'x-foo': string }
              >;
            };
          };
        }
      >
    >;
  });

  it('should be typed correctly with base headers', () => {
    const contract = c.router(
      {
        posts: {
          getPost: {
            method: 'GET',
            path: '/posts/:id',
            responses: {
              200: z.object({
                id: z.number(),
              }),
            },
          },
        },
      },
      {
        baseHeaders: z.object({
          'x-foo': z.string(),
        }),
      }
    );

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          posts: {
            getPost: {
              method: 'GET';
              path: '/posts/:id';
              responses: {
                200: z.ZodObject<
                  {
                    id: z.ZodNumber;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    id: number;
                  },
                  {
                    id: number;
                  }
                >;
              };
              headers: z.ZodObject<
                { 'x-foo': z.ZodString },
                'strip',
                z.ZodTypeAny,
                { 'x-foo': string },
                { 'x-foo': string }
              >;
            };
          };
        }
      >
    >;
  });

  it('should be typed correctly with merged headers', () => {
    const contract = c.router(
      {
        posts: {
          getPost: {
            method: 'GET',
            path: '/posts/:id',
            responses: {
              200: z.object({
                id: z.number(),
              }),
            },
            headers: z.object({
              'x-bar': z.string(),
            }),
          },
        },
      },
      {
        baseHeaders: z.object({
          'x-foo': z.string(),
        }),
      }
    );

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          posts: {
            getPost: {
              method: 'GET';
              path: '/posts/:id';
              responses: {
                200: z.ZodObject<
                  {
                    id: z.ZodNumber;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    id: number;
                  },
                  {
                    id: number;
                  }
                >;
              };
              headers: z.ZodObject<
                z.objectUtil.MergeShapes<
                  { 'x-foo': z.ZodString },
                  { 'x-bar': z.ZodString }
                >,
                'strip',
                z.ZodTypeAny,
                { 'x-foo': string; 'x-bar': string },
                { 'x-foo': string; 'x-bar': string }
              >;
            };
          };
        }
      >
    >;
  });

  it('should be typed correctly with overridden headers', () => {
    const contract = c.router(
      {
        posts: {
          getPost: {
            method: 'GET',
            path: '/posts/:id',
            responses: {
              200: z.object({
                id: z.number(),
              }),
            },
            headers: z.object({
              'x-foo': z.string().optional(),
            }),
          },
        },
      },
      {
        baseHeaders: z.object({
          'x-foo': z.string(),
        }),
      }
    );

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          posts: {
            getPost: {
              method: 'GET';
              path: '/posts/:id';
              responses: {
                200: z.ZodObject<
                  {
                    id: z.ZodNumber;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    id: number;
                  },
                  {
                    id: number;
                  }
                >;
              };
              headers: z.ZodObject<
                z.objectUtil.MergeShapes<
                  { 'x-foo': z.ZodString },
                  { 'x-foo': z.ZodOptional<z.ZodString> }
                >,
                'strip',
                z.ZodTypeAny,
                { 'x-foo'?: string },
                { 'x-foo'?: string }
              >;
            };
          };
        }
      >
    >;
  });

  it('should be typed without zod', () => {
    const contract = c.router({
      getPost: {
        method: 'GET',
        path: '/posts/:id',
        responses: {
          200: c.body<{ id: number }>(),
        },
      },
    });

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          getPost: {
            method: 'GET';
            path: '/posts/:id';
            responses: {
              200: ContractPlainType<{
                id: number;
              }>;
            };
          };
        }
      >
    >;
  });

  it('should add strictStatusCodes=true option to routes', () => {
    const contract = c.router(
      {
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          responses: {
            200: c.body<{ id: number }>(),
          },
        },
      },
      {
        strictStatusCodes: true,
      }
    );

    expect(contract.getPost.strictStatusCodes).toStrictEqual(true);

    type ContractShape = Expect<
      Equal<
        Pick<typeof contract.getPost, 'strictStatusCodes'>,
        {
          strictStatusCodes: true;
        }
      >
    >;
  });

  it('should add strictStatusCodes=false option to routes', () => {
    const contract = c.router(
      {
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          responses: {
            200: c.body<{ id: number }>(),
          },
        },
      },
      {
        strictStatusCodes: false,
      }
    );

    expect(contract.getPost.strictStatusCodes).toStrictEqual(false);

    type ContractShape = Expect<
      Equal<
        Pick<typeof contract.getPost, 'strictStatusCodes'>,
        {
          strictStatusCodes: false;
        }
      >
    >;
  });

  it('should merge strictStatusCodes options correctly is route is true', () => {
    const contract = c.router(
      {
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          responses: {
            200: c.body<{ id: number }>(),
          },
          strictStatusCodes: true,
        },
      },
      {
        strictStatusCodes: false,
      }
    );

    expect(contract.getPost.strictStatusCodes).toStrictEqual(true);

    type ContractShape = Expect<
      Equal<
        Pick<typeof contract.getPost, 'strictStatusCodes'>,
        {
          strictStatusCodes: true;
        }
      >
    >;
  });

  it('should merge strictStatusCodes options correctly if route is false', () => {
    const contract = c.router(
      {
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          responses: {
            200: c.body<{ id: number }>(),
          },
          strictStatusCodes: false,
        },
      },
      {
        strictStatusCodes: true,
      }
    );

    expect(contract.getPost.strictStatusCodes).toStrictEqual(false);

    type ContractShape = Expect<
      Equal<
        Pick<typeof contract.getPost, 'strictStatusCodes'>,
        {
          strictStatusCodes: false;
        }
      >
    >;
  });

  describe('pathPrefix', () => {
    it('Should recursively apply pathPrefix to path', () => {
      const postsContractNested = c.router(
        {
          getPost: {
            path: '/:id',
            method: 'GET',
            responses: { 200: c.response<{ id: string }>() },
          },
        },
        { pathPrefix: '/posts' }
      );
      const postsContract = c.router(
        {
          posts: postsContractNested,
        },
        { pathPrefix: '/v1' }
      );
      expect(postsContractNested.getPost.path).toStrictEqual('/posts/:id');
      expect(postsContract.posts.getPost.path).toStrictEqual('/v1/posts/:id');

      type PostsContractNestedShape = Expect<
        Equal<
          typeof postsContractNested,
          {
            getPost: {
              path: '/posts/:id';
              method: 'GET';
              responses: { 200: ContractPlainType<{ id: string }> };
            };
          }
        >
      >;

      type PostsContractShape = Expect<
        Equal<
          typeof postsContract,
          {
            posts: {
              getPost: {
                path: '/v1/posts/:id';
                method: 'GET';
                responses: { 200: ContractPlainType<{ id: string }> };
              };
            };
          }
        >
      >;
    });
  });

  describe('validateResponseOnClient', () => {
    it('Should recursively apply validateResponseOnClient to routes', () => {
      const postsContractNested = c.router(
        {
          getPost: {
            path: '/:id',
            method: 'GET',
            responses: { 200: c.response<{ id: string }>() },

          },
        }
      );
      const postsContract = c.router(
        {
          posts: postsContractNested,
        },
        { validateResponseOnClient: true }
      );
      expect(postsContractNested.getPost).toHaveProperty('validateResponseOnClient', undefined)
      expect(postsContract.posts.getPost).toHaveProperty('validateResponseOnClient', true)
    });

    it('Should not override validateResponseOnClient if set on nested router', () => {
      const postsContractNested = c.router(
        {
          getPost: {
            path: '/:id',
            method: 'GET',
            responses: { 200: c.response<{ id: string }>() },
          },
        },
        { validateResponseOnClient: false }
      );
      const postsContract = c.router(
        {
          posts: postsContractNested,
        },
        { validateResponseOnClient: true }
      );
      expect(postsContractNested.getPost).toHaveProperty('validateResponseOnClient', false)
      expect(postsContract.posts.getPost).toHaveProperty('validateResponseOnClient', false)
    });

    it('Should not override validateResponseOnClient when set directly on route', () => {
      const postsContract = c.router(
        {
          getPost: {
            path: '/:id',
            method: 'GET',
            responses: { 200: c.response<{ id: string }>() },
          },
          getPostDangerously: {
            path: '/:id/dangerous',
            method: 'GET',
            responses: { 200: c.response<{ id: string }>() },
            validateResponseOnClient: false,
          },
        },
        { validateResponseOnClient: true }
      );

      expect(postsContract.getPost).toHaveProperty('validateResponseOnClient', true)
      expect(postsContract.getPostDangerously).toHaveProperty('validateResponseOnClient', false)
    });
  });

  it('should set type correctly for non-json response', () => {
    const contract = c.router({
      getCss: {
        method: 'GET',
        path: '/style.css',
        responses: {
          200: c.otherResponse({
            contentType: 'text/css',
            body: c.response<string>(),
          }),
        },
      },
    });

    expect(contract.getCss.responses['200']).toEqual({
      contentType: 'text/css',
      body: ContractPlainTypeRuntimeSymbol,
    });

    type ResponseType = Expect<
      Equal<
        typeof contract.getCss.responses['200'],
        ContractOtherResponse<ContractPlainType<string>>
      >
    >;
  });
});
