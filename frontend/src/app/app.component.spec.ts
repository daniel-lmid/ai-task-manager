import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { TaskApiService } from './tasks/task-api.service';
import { of, throwError } from 'rxjs';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let apiSpy: jasmine.SpyObj<TaskApiService>;

  const mockTasks = [
    { id: 1, title: 'Task 1', description: 'Desc', completed: false },
    { id: 2, title: 'Task 2', description: 'Desc', completed: true }
  ];

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('TaskApiService', [
      'list',
      'create',
      'delete',
      'toggleComplete',
      'update'
    ]);

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: TaskApiService, useValue: spy }]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    apiSpy = TestBed.inject(TaskApiService) as jasmine.SpyObj<TaskApiService>;
  });

  // ✅ create
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // =========================
  // INIT
  // =========================

  it('should call refresh on init', () => {
    spyOn(component, 'refresh');
    component.ngOnInit();
    expect(component.refresh).toHaveBeenCalled();
  });

  // =========================
  // REFRESH
  // =========================

  it('should load tasks successfully', () => {
    apiSpy.list.and.returnValue(of(mockTasks));

    component.refresh();

    expect(component.tasks).toEqual(mockTasks);
    expect(component.loading).toBeFalse();
    expect(component.error).toBeNull();
  });

  it('should handle error on load tasks', () => {
    apiSpy.list.and.returnValue(throwError(() => new Error('fail')));

    component.refresh();

    expect(component.error).toBe('Failed to load tasks. Is the backend running?');
    expect(component.loading).toBeFalse();
  });

  // =========================
  // CREATE
  // =========================

  it('should add new task on save', () => {
    const newTask = { id: 3, title: 'New', description: 'Desc', completed: false };

    apiSpy.create.and.returnValue(of(newTask));
    component.tasks = [...mockTasks];

    component.onSave({ title: 'New', description: 'Desc' });

    expect(component.tasks[0]).toEqual(newTask);
  });

  it('should handle error on save', () => {
    apiSpy.create.and.returnValue(throwError(() => new Error('fail')));

    component.onSave({ title: 'New', description: 'Desc' });

    expect(component.error).toBe('Failed to save task.');
  });

  // =========================
  // DELETE
  // =========================

  it('should delete task', () => {
    apiSpy.delete.and.returnValue(of(void 0));
    component.tasks = [...mockTasks];

    component.onDelete(1);

    expect(component.tasks.length).toBe(1);
    expect(component.tasks.find(t => t.id === 1)).toBeUndefined();
  });

  it('should handle delete error', () => {
    apiSpy.delete.and.returnValue(throwError(() => new Error('fail')));

    component.onDelete(1);

    expect(component.error).toBe('Failed to delete task.');
  });

  // =========================
  // TOGGLE COMPLETE
  // =========================

  it('should toggle task completion', () => {
    const updatedTask = { ...mockTasks[0], completed: true };

    apiSpy.toggleComplete.and.returnValue(of(updatedTask));
    component.tasks = [...mockTasks];

    component.onToggleComplete(1);

    const task = component.tasks.find(t => t.id === 1);
    expect(task?.completed).toBeTrue();
  });

  it('should handle toggle error', () => {
    apiSpy.toggleComplete.and.returnValue(throwError(() => new Error('fail')));

    component.onToggleComplete(1);

    expect(component.error).toBe('Failed to update task.');
  });

  // =========================
  // UPDATE (EDIT)
  // =========================

  it('should update task', () => {
    const updatedTask = {
      id: 1,
      title: 'Updated',
      description: 'Updated desc',
      completed: false
    };

    apiSpy.update.and.returnValue(of(updatedTask));
    component.tasks = [...mockTasks];

    component.onUpdate({
      id: 1,
      title: 'Updated',
      description: 'Updated desc'
    });

    const task = component.tasks.find(t => t.id === 1);
    expect(task?.title).toBe('Updated');
  });

  it('should handle update error', () => {
    apiSpy.update.and.returnValue(throwError(() => new Error('fail')));

    component.onUpdate({
      id: 1,
      title: 'Updated',
      description: 'Updated desc'
    });

    expect(component.error).toBe('Failed to update task.');
  });
});