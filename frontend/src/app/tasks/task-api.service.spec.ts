import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TaskApiService } from './task-api.service';

describe('TaskApiService', () => {
  it('calls list/create/delete/toggleComplete endpoints', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    const svc = TestBed.inject(TaskApiService);
    const http = TestBed.inject(HttpTestingController);

    svc.list().subscribe();
    const listReq = http.expectOne('http://localhost:8080/api/tasks');
    expect(listReq.request.method).toBe('GET');
    listReq.flush([]);

    svc.create({ title: 'T1', description: 'D1' }).subscribe();
    const createReq = http.expectOne('http://localhost:8080/api/tasks');
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body).toEqual({ title: 'T1', description: 'D1' });
    createReq.flush({
      id: 1,
      title: 'T1',
      description: 'D1',
      completed: false,
      createdAt: new Date().toISOString(),
    });

    svc.toggleComplete(1).subscribe();
    const toggleReq = http.expectOne('http://localhost:8080/api/tasks/1/complete');
    expect(toggleReq.request.method).toBe('PATCH');
    toggleReq.flush({
      id: 1,
      title: 'T1',
      description: 'D1',
      completed: true,
      createdAt: new Date().toISOString(),
    });

    svc.delete(1).subscribe();
    const deleteReq = http.expectOne('http://localhost:8080/api/tasks/1');
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);

    http.verify();
  });
});

