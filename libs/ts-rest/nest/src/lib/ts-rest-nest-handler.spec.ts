import { initContract } from '@ts-rest/core';
import {
  doesUrlMatchContractPath,
  TsRestException,
  tsRestHandler,
  TsRestHandler,
} from './ts-rest-nest-handler';
import { z } from 'zod';
import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as supertest from 'supertest';
import { TsRest } from './ts-rest.decorator';
import path = require('path');
import { FileInterceptor } from '@nestjs/platform-express';
import { FastifyAdapter } from '@nestjs/platform-fastify';

export type Equal<a, b> = (<T>() => T extends a ? 1 : 2) extends <
  T
>() => T extends b ? 1 : 2
  ? true
  : false;

export type Expect<a extends true> = a;

jest.setTimeout(10000);

describe('doesUrlMatchContractPath', () => {
  it.each`
    contractPath    | url           | expected
    ${'/'}          | ${'/'}        | ${true}
    ${'/'}          | ${'/api'}     | ${false}
    ${'/api'}       | ${'/api'}     | ${true}
    ${'/api/'}      | ${'/api'}     | ${true}
    ${'/api'}       | ${'/api/'}    | ${true}
    ${'/api/'}      | ${'/api/'}    | ${true}
    ${'/posts/:id'} | ${'/posts/1'} | ${true}
    ${'/posts/:id'} | ${'/posts/1'} | ${true}
    ${'/posts/:id'} | ${'/posts'}   | ${false}
  `(
    'should return $expected when contractPath is $contractPath and url is $url',
    ({ contractPath, url, expected }) => {
      expect(doesUrlMatchContractPath(contractPath, url)).toBe(expected);
    }
  );
});

describe('ts-rest-nest-handler', () => {
  describe('multi-handler api', () => {
    it('should be able to implement a whole contract', async () => {
      const c = initContract();

      const contract = c.router({
        getRequest: {
          path: '/test',
          method: 'GET',
          responses: {
            200: z.object({
              message: z.string(),
            }),
          },
        },
        postRequest: {
          path: '/test',
          method: 'POST',
          body: z.object({
            message: z.string(),
          }),
          responses: {
            200: z.object({
              message: z.string(),
            }),
          },
        },
      });

      @Controller()
      class TestController {
        @TsRestHandler(contract)
        async handler() {
          return tsRestHandler(contract, {
            getRequest: async () => ({
              status: 200,
              body: { message: 'hello' },
            }),
            postRequest: async ({ body }) => ({
              status: 200,
              body: { message: body.message },
            }),
          });
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      const responseGet = await supertest(app.getHttpServer())
        .get('/test')
        .send();

      expect(responseGet.status).toBe(200);
      expect(responseGet.body).toEqual({ message: 'hello' });

      const responsePost = await supertest(app.getHttpServer())
        .post('/test')
        .send({ message: 'hello' });

      expect(responsePost.status).toBe(200);
      expect(responsePost.body).toEqual({ message: 'hello' });
    });

    describe('body validation', () => {
      it('should validate body', async () => {
        const c = initContract();

        const contract = c.router({
          postRequest: {
            path: '/test',
            method: 'POST',
            body: z.object({
              message: z.string(),
            }),
            responses: {
              200: z.object({
                message: z.string(),
              }),
            },
          },
        });

        @Controller()
        class SingleHandlerTestController {
          @TsRestHandler(contract)
          async postRequest() {
            return tsRestHandler(contract, {
              postRequest: async ({ body }) => ({
                status: 200,
                body: body,
              }),
            });
          }
        }

        const moduleRef = await Test.createTestingModule({
          controllers: [SingleHandlerTestController],
        }).compile();

        const app = moduleRef.createNestApplication();
        await app.init();

        const response = await supertest(app.getHttpServer())
          .post('/test')
          .send({ message: 'hello' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: 'hello' });

        const responsePost = await supertest(app.getHttpServer())
          .post('/test')
          .send({ message: 123 });

        expect(responsePost.status).toBe(400);
        expect(responsePost.body).toEqual({
          bodyResult: {
            issues: [
              {
                code: 'invalid_type',
                expected: 'string',
                received: 'number',
                path: ['message'],
                message: 'Expected string, received number',
              },
            ],
            name: 'ZodError',
          },
          headersResult: null,
          queryResult: null,
          paramsResult: null,
        });
      });

      it("shouldn't validate body", async () => {
        const c = initContract();

        const contract = c.router({
          postRequest: {
            path: '/test',
            method: 'POST',
            body: z.object({
              message: z.string(),
            }),
            responses: {
              200: z.object({
                message: z.string(),
              }),
            },
          },
        });

        @Controller()
        class SingleHandlerTestController {
          @TsRestHandler(contract, {
            validateRequestBody: false,
          })
          async postRequest() {
            return tsRestHandler(contract, {
              postRequest: async ({ body }) => ({
                status: 200,
                body: body,
              }),
            });
          }
        }

        const moduleRef = await Test.createTestingModule({
          controllers: [SingleHandlerTestController],
        }).compile();

        const app = moduleRef.createNestApplication();
        await app.init();

        const response = await supertest(app.getHttpServer())
          .post('/test')
          .send({ message: 'hello' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: 'hello' });

        const responsePost = await supertest(app.getHttpServer())
          .post('/test')
          .send({ message: 123 });

        expect(responsePost.status).toBe(200);
        expect(responsePost.body).toEqual({ message: 123 });
      });
    });

    describe('validate headers', () => {
      it('should validate', async () => {
        const c = initContract();

        const contract = c.router({
          getRequest: {
            path: '/',
            method: 'GET',
            responses: {
              200: z.object({
                message: z.string(),
              }),
            },
            headers: z.object({
              some: z.string(),
            }),
          },
        });

        @Controller()
        class SingleHandlerTestController {
          @TsRestHandler(contract)
          async postRequest() {
            return tsRestHandler(contract, {
              getRequest: async () => ({
                status: 200,
                body: { message: 'ok' },
              }),
            });
          }
        }

        const moduleRef = await Test.createTestingModule({
          controllers: [SingleHandlerTestController],
        }).compile();

        const app = moduleRef.createNestApplication();
        await app.init();

        const response = await supertest(app.getHttpServer()).get('/').send();

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          headersResult: {
            issues: [
              {
                code: 'invalid_type',
                expected: 'string',
                message: 'Required',
                path: ['some'],
                received: 'undefined',
              },
            ],
            name: 'ZodError',
          },
          bodyResult: null,
          queryResult: null,
          paramsResult: null,
        });
      });

      it("shouldn't validate", async () => {
        const c = initContract();

        const contract = c.router({
          getRequest: {
            path: '/',
            method: 'GET',
            responses: {
              200: z.object({
                message: z.string(),
              }),
            },
            headers: z.object({
              some: z.string(),
            }),
          },
        });

        @Controller()
        class SingleHandlerTestController {
          @TsRestHandler(contract, { validateRequestHeaders: false })
          async postRequest() {
            return tsRestHandler(contract, {
              getRequest: async () => ({
                status: 200,
                body: { message: 'ok' },
              }),
            });
          }
        }

        const moduleRef = await Test.createTestingModule({
          controllers: [SingleHandlerTestController],
        }).compile();

        const app = moduleRef.createNestApplication();
        await app.init();

        const response = await supertest(app.getHttpServer()).get('/').send();

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          message: 'ok',
        });
      });
    });

    describe('validate query', () => {
      it('should validate', async () => {
        const c = initContract();

        const contract = c.router({
          getRequest: {
            path: '/',
            method: 'GET',
            query: z.object({
              ids: z.array(z.string()),
            }),
            responses: {
              200: z.object({
                message: z.string(),
              }),
            },
          },
        });

        @Controller()
        class SingleHandlerTestController {
          @TsRestHandler(contract)
          async postRequest() {
            return tsRestHandler(contract, {
              getRequest: async () => ({
                status: 200,
                body: { message: 'ok' },
              }),
            });
          }
        }

        const moduleRef = await Test.createTestingModule({
          controllers: [SingleHandlerTestController],
        }).compile();

        const app = moduleRef.createNestApplication();
        await app.init();

        const response = await supertest(app.getHttpServer())
          .get('/?id=some-id')
          .send();

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          headersResult: null,
          bodyResult: null,
          queryResult: {
            issues: [
              {
                code: 'invalid_type',
                expected: 'array',
                message: 'Required',
                path: ['ids'],
                received: 'undefined',
              },
            ],
            name: 'ZodError',
          },
          paramsResult: null,
        });
      });

      it("shouldn't validate", async () => {
        const c = initContract();

        const contract = c.router({
          getRequest: {
            path: '/',
            method: 'GET',
            query: z.object({
              ids: z.array(z.string()),
            }),
            responses: {
              200: z.object({
                message: z.string(),
              }),
            },
          },
        });

        @Controller()
        class SingleHandlerTestController {
          @TsRestHandler(contract, { validateRequestQuery: false })
          async postRequest() {
            return tsRestHandler(contract, {
              getRequest: async () => ({
                status: 200,
                body: { message: 'ok' },
              }),
            });
          }
        }

        const moduleRef = await Test.createTestingModule({
          controllers: [SingleHandlerTestController],
        }).compile();

        const app = moduleRef.createNestApplication();
        await app.init();

        const response = await supertest(app.getHttpServer())
          .get('/?id=some-id')
          .send();

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: 'ok' });
      });
    });
  });

  describe('single-handler api', () => {
    it('should be able to implement a single `AppRoute`', async () => {
      const c = initContract();

      const contract = c.router({
        getRequest: {
          path: '/test',
          method: 'GET',
          responses: {
            200: z.object({
              message: z.string(),
            }),
          },
        },
        postRequest: {
          path: '/test',
          method: 'POST',
          body: z.object({
            message: z.string(),
          }),
          responses: {
            200: z.object({
              message: z.string(),
            }),
          },
        },
      });

      @Controller()
      class SingleHandlerTestController {
        @TsRestHandler(contract.getRequest)
        async getRequest() {
          return tsRestHandler(contract.getRequest, async () => ({
            status: 200,
            body: { message: 'hello' },
          }));
        }

        @TsRestHandler(contract.postRequest)
        async postRequest() {
          return tsRestHandler(contract.postRequest, async () => ({
            status: 200,
            body: { message: 'hello' },
          }));
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [SingleHandlerTestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      const response = await supertest(app.getHttpServer()).get('/test').send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'hello' });

      const responsePost = await supertest(app.getHttpServer())
        .post('/test')
        .send({ message: 'hello' });

      expect(responsePost.status).toBe(200);
      expect(responsePost.body).toEqual({ message: 'hello' });
    });

    it('should validate body', async () => {
      const c = initContract();

      const contract = c.router({
        postRequest: {
          path: '/test',
          method: 'POST',
          body: z.object({
            message: z.string(),
          }),
          responses: {
            200: z.object({
              message: z.string(),
            }),
          },
        },
      });

      @Controller()
      class SingleHandlerTestController {
        @TsRestHandler(contract.postRequest)
        async postRequest() {
          return tsRestHandler(contract.postRequest, async ({ body }) => ({
            status: 200,
            body: body,
          }));
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [SingleHandlerTestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      const response = await supertest(app.getHttpServer())
        .post('/test')
        .send({ message: 'hello' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'hello' });

      const responsePost = await supertest(app.getHttpServer())
        .post('/test')
        .send({ message: 123 });

      expect(responsePost.status).toBe(400);
      expect(responsePost.body).toEqual({
        bodyResult: {
          issues: [
            {
              code: 'invalid_type',
              expected: 'string',
              received: 'number',
              path: ['message'],
              message: 'Expected string, received number',
            },
          ],
          name: 'ZodError',
        },
        headersResult: null,
        queryResult: null,
        paramsResult: null,
      });
    });

    it('should be able to enable response validation on the `TsRestHandler` decorator', async () => {
      const c = initContract();

      const contract = c.router({
        test: {
          path: '/test',
          method: 'GET',
          responses: {
            200: z.object({
              message: z.string(),
            }),
          },
        },
      });

      @Controller()
      class SingleHandlerTestController {
        @TsRestHandler(contract.test, {
          validateResponses: true,
        })
        async postRequest() {
          return tsRestHandler(contract.test, async () => ({
            status: 200,
            // Bad response as we lied to TS :(
            body: { message: 123123 as unknown as string },
          }));
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [SingleHandlerTestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      const response = await supertest(app.getHttpServer()).get('/test').send();

      expect(response.status).toBe(500);
    });

    it('should be able to upload files and other multipart/form-data', async () => {
      const c = initContract();

      const contract = c.router({
        multi: {
          method: 'POST',
          path: '/multi',
          body: z.object({
            messageAsField: z.string(),
            file: z.custom<File>((v) => true),
          }),
          contentType: 'multipart/form-data',
          responses: {
            200: z.object({
              messageAsField: z.string(),
              fileSize: z.number(),
            }),
          },
        },
      });

      @Controller()
      class SingleHandlerTestController {
        @Post('/nest-multi')
        @UseInterceptors(FileInterceptor('file'))
        nestMulti(
          @Body() body: { messageAsField: string },
          @UploadedFile() file: File
        ) {
          return {
            messageAsField: body.messageAsField,
            fileSize: file.size,
          };
        }

        @TsRestHandler(contract.multi)
        @UseInterceptors(FileInterceptor('file'))
        async postRequest(@UploadedFile() file: File) {
          return tsRestHandler(contract.multi, async (args) => {
            return {
              status: 200,
              body: {
                messageAsField: args.body.messageAsField,
                fileSize: file.size,
              },
            };
          });
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [SingleHandlerTestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      const responseNested = await supertest(app.getHttpServer())
        .post('/nest-multi')
        .field('messageAsField', 'hello from nest')
        .attach('file', path.join(__dirname, './nest.png'));

      expect({
        status: responseNested.status,
        body: responseNested.body,
      }).toEqual({
        status: 201,
        body: {
          messageAsField: 'hello from nest',
          fileSize: 11338,
        },
      });

      const response = await supertest(app.getHttpServer())
        .post('/multi')
        .field('messageAsField', 'hello from ts-rest')
        .attach('file', path.join(__dirname, './nest.png'));

      expect({
        status: response.status,
        body: response.body,
      }).toEqual({
        status: 200,
        body: {
          messageAsField: 'hello from ts-rest',
          fileSize: 11338,
        },
      });

      const errorsForBadField = await supertest(app.getHttpServer())
        .post('/multi')
        .attach('file', path.join(__dirname, './nest.png'));

      expect({
        status: errorsForBadField.status,
        body: errorsForBadField.body,
      }).toEqual({
        status: 400,
        body: {
          bodyResult: {
            issues: [
              {
                code: 'invalid_type',
                expected: 'string',
                received: 'undefined',

                path: ['messageAsField'],
                message: 'Required',
              },
            ],
            name: 'ZodError',
          },
          headersResult: null,
          paramsResult: null,
          queryResult: null,
        },
      });
    });

    it('should remove extra body keys with response validation enabled on the `TsRestHandler` decorator', async () => {
      const c = initContract();

      const contract = c.router({
        test: {
          path: '/returns-too-much',
          method: 'GET',
          responses: {
            200: z.object({
              message: z.string(),
              nestedObject: z.object({
                nestedString: z.string(),
              }),
            }),
          },
        },
        testArray: {
          path: '/returns-too-much-array',
          method: 'GET',
          responses: {
            200: z.array(
              z.object({
                message: z.string(),
              })
            ),
          },
        },
      });

      @Controller()
      class SingleHandlerTestController {
        @TsRestHandler(contract, {
          validateResponses: true,
        })
        async postRequest() {
          return tsRestHandler(contract, {
            test: async () => ({
              status: 200,
              body: {
                message: 'valid string',
                extra: 'SHOULD NOT BE IN RESPONSE',
                nestedObject: {
                  nestedString: 'valid string',
                  nestedExtra: 'SHOULD NOT BE IN RESPONSE',
                },
              },
            }),
            testArray: async () => ({
              status: 200,
              body: [
                {
                  message: 'valid string',
                  extra: 'SHOULD NOT BE IN RESPONSE',
                },
              ],
            }),
          });
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [SingleHandlerTestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      const response = await supertest(app.getHttpServer())
        .get('/returns-too-much')
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'valid string',
        nestedObject: { nestedString: 'valid string' },
      });

      const responseArray = await supertest(app.getHttpServer())
        .get('/returns-too-much-array')
        .send();

      expect(responseArray.status).toBe(200);
      expect(responseArray.body).toEqual([
        {
          message: 'valid string',
        },
      ]);
    });

    it("should be able to override the behaviour of the class's response validation", async () => {
      const c = initContract();

      const contract = c.router({
        test: {
          path: '/test',
          method: 'GET',
          responses: {
            200: z.object({
              message: z.string(),
            }),
          },
        },
      });

      @Controller()
      @TsRest({
        validateResponses: true,
      })
      class SingleHandlerTestController {
        @TsRestHandler(contract.test, {
          validateResponses: false,
        })
        async postRequest() {
          return tsRestHandler(contract.test, async () => ({
            status: 200,
            // shouldn't throw an error as we disabled it
            body: { message: 123123 as unknown as string },
          }));
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [SingleHandlerTestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      const response = await supertest(app.getHttpServer()).get('/test').send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 123123 });
    });

    it('should be able to throw a type-safe response', async () => {
      const c = initContract();

      const contract = c.router({
        test: {
          path: '/test',
          method: 'GET',
          responses: {
            200: z.object({
              message: z.string(),
            }),
            400: z.object({
              myError: z.string(),
            }),
          },
        },
      });

      @Controller()
      class SingleHandlerTestController {
        @TsRestHandler(contract, { validateResponses: true })
        async postRequest() {
          return tsRestHandler(contract, {
            test: async () => {
              throw new TsRestException(contract.test, {
                status: 400,
                body: {
                  myError: 'my error',
                  // @ts-expect-error we want to make sure `validateResponses` is working
                  extraProp: 'should not be in response',
                },
              });
            },
          });
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [SingleHandlerTestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      const response = await supertest(app.getHttpServer()).get('/test').send();

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ myError: 'my error' });
    });

    it('should return a 500 if you throw an invalid response in a handler that has response validation enabled on the `TsRestHandler` decorator', async () => {
      const c = initContract();

      const contract = c.router(
        {
          test: {
            path: '/test/:id',
            pathParams: z.object({
              id: z.coerce.number(),
            }),
            method: 'GET',
            responses: {
              200: z.object({
                message: z.string(),
              }),
              400: z.object({
                numberOfFuckUps: z.number(),
              }),
            },
          },
        },
        {
          strictStatusCodes: true,
        }
      );

      @Controller()
      class SingleHandlerTestController {
        @TsRestHandler(contract, { validateResponses: true })
        async postRequest() {
          return tsRestHandler(contract, {
            test: async ({ params }) => {
              const id = params.id;

              if (id === 666) {
                throw new TsRestException(contract.test, {
                  status: 400,
                  body: {
                    // @ts-expect-error intentionally bad response
                    bad_response: 666,
                  },
                });
              }

              return {
                status: 200,
                body: {
                  message: 'All is OK',
                },
              };
            },
          });
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [SingleHandlerTestController],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      const response = await supertest(app.getHttpServer())
        .get('/test/666')
        .send();

      expect(response.status).toBe(500);
    });

    it('types should work well', () => {
      const c = initContract();

      const contract = c.router({
        test: {
          path: '/test/:id',
          method: 'POST',
          body: c.body<any>(),
          responses: {
            200: z.object({
              message: z.string(),
            }),
          },
        },
      });

      @Controller()
      class SingleHandlerTestController {
        @TsRestHandler(contract)
        async postRequest() {
          return tsRestHandler(contract, {
            test: async ({ body }) => {
              type BodyShouldBeAny = Expect<Equal<typeof body, any>>;

              return {
                status: 200,
                body: {
                  message: 'All is OK',
                },
              };
            },
          });
        }
      }
    });
  });

  it('should be able to combine single-handler, multi-handler and vanilla nest controllers', async () => {
    const c = initContract();

    const contract = c.router({
      getRequest: {
        path: '/test',
        method: 'GET',
        responses: {
          200: z.object({
            message: z.string(),
          }),
        },
      },
      postRequest: {
        path: '/test',
        method: 'POST',
        body: z.object({
          message: z.string(),
        }),
        responses: {
          200: z.object({
            message: z.string(),
          }),
        },
      },
    });

    @Controller()
    class MultiTypeHandlerController {
      @TsRestHandler(contract.postRequest)
      async handler2() {
        return tsRestHandler(contract.postRequest, async ({ body }) => ({
          status: 200,
          body: { message: body.message },
        }));
      }

      @Get('/basic-nest-endpoint')
      async basicNestEndpoint() {
        return { message: 'hello' };
      }

      @TsRestHandler({ getRequest: contract.getRequest })
      async handler() {
        return tsRestHandler(
          { getRequest: contract.getRequest },
          {
            getRequest: async () => ({
              status: 200,
              body: { message: 'hello' },
            }),
          }
        );
      }
    }

    const moduleRef = await Test.createTestingModule({
      controllers: [MultiTypeHandlerController],
    }).compile();

    const app = moduleRef.createNestApplication();

    await app.init();

    const response = await supertest(app.getHttpServer()).get('/test').send();

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'hello' });

    const responsePost = await supertest(app.getHttpServer())
      .post('/test')
      .send({ message: 'hello' });

    expect(responsePost.status).toBe(200);
    expect(responsePost.body).toEqual({ message: 'hello' });

    const responseBasicNestEndpoint = await supertest(app.getHttpServer())
      .get('/basic-nest-endpoint')
      .send();

    expect(responseBasicNestEndpoint.status).toBe(200);
    expect(responseBasicNestEndpoint.body).toEqual({ message: 'hello' });
  });

  it('should work with fastify', async () => {
    const c = initContract();

    const contract = c.router({
      getPosts: {
        path: '/posts',
        method: 'GET',
        query: z.object({
          limit: z.string(),
        }),
        responses: {
          200: z.array(
            z.object({
              id: z.number(),
            })
          ),
        },
      },
      getPost: {
        path: '/posts/:id',
        method: 'GET',
        pathParams: z.object({
          id: z.coerce.number(),
        }),
        responses: {
          200: z.object({
            id: z.number(),
          }),
        },
      },
      deletePost: {
        path: '/posts/:id',
        method: 'DELETE',
        body: null,
        pathParams: z.object({
          id: z.coerce.number(),
        }),
        responses: {
          200: z.object({
            id: z.number(),
          }),
        },
      },
      createPost: {
        path: '/posts',
        method: 'POST',
        body: z.object({
          title: z.string(),
          content: z.string(),
        }),
        responses: {
          201: z.object({
            id: z.number(),
            title: z.string(),
            content: z.string(),
          }),
        },
      },
      getHtml: {
        path: '/html',
        method: 'GET',
        responses: {
          200: c.otherResponse({
            contentType: 'text/html',
            body: z.string(),
          }),
        },
      },
    });

    @Controller()
    class FastifyController {
      @TsRestHandler(contract)
      async handler() {
        return tsRestHandler(contract, {
          getPosts: async () => ({
            status: 200,
            body: [{ id: 1 }, { id: 2 }],
          }),
          getPost: async ({ params }) => ({
            status: 200,
            body: {
              id: params.id,
            },
          }),
          deletePost: async ({ params }) => ({
            status: 200,
            body: {
              id: params.id,
            },
          }),
          createPost: async ({ body }) => ({
            status: 201,
            body: {
              id: 1,
              title: body.title,
              content: body.content,
            },
          }),
          getHtml: async () => ({
            status: 200,
            body: '<h1>hello world</h1>',
          }),
        });
      }
    }

    const moduleRef = await Test.createTestingModule({
      controllers: [FastifyController],
    }).compile();

    const app = moduleRef.createNestApplication(new FastifyAdapter());

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const response = await supertest(app.getHttpServer())
      .get('/posts?limit=10')
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 1 }, { id: 2 }]);

    const responsePost = await supertest(app.getHttpServer())
      .get('/posts/1')
      .send();

    expect({ status: responsePost.status, body: responsePost.body }).toEqual({
      status: 200,
      body: { id: 1 },
    });

    const responseDelete = await supertest(app.getHttpServer())
      .delete('/posts/1')
      .send();

    expect({
      status: responseDelete.status,
      body: responseDelete.body,
    }).toEqual({
      status: 200,
      body: { id: 1 },
    });

    const responseDeleteBad = await supertest(app.getHttpServer())
      .delete('/posts/jeff')
      .send({ id: 1 });

    expect({
      status: responseDeleteBad.status,
      body: responseDeleteBad.body,
    }).toEqual({
      status: 400,
      body: {
        bodyResult: null,
        headersResult: null,
        paramsResult: {
          issues: [
            {
              code: 'invalid_type',
              expected: 'number',
              received: 'nan',
              path: ['id'],
              message: 'Expected number, received nan',
            },
          ],
          name: 'ZodError',
        },
        queryResult: null,
      },
    });

    const responseCreate = await supertest(app.getHttpServer())
      .post('/posts')
      .send({ title: 'hello', content: 'world' });

    expect({
      status: responseCreate.status,
      body: responseCreate.body,
    }).toEqual({
      status: 201,
      body: {
        id: 1,
        title: 'hello',
        content: 'world',
      },
    });

    const nonJsonResponse = await supertest(app.getHttpServer())
      .get('/html')
      .send();

    expect({
      status: nonJsonResponse.status,
      text: nonJsonResponse.text,
      headers: nonJsonResponse.headers,
    }).toEqual({
      status: 200,
      text: '<h1>hello world</h1>',
      headers: expect.objectContaining({
        'content-type': 'text/html',
        'content-length': '20',
      }),
    });
  });
});
