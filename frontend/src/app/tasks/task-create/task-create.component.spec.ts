import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskCreateComponent } from './task-create.component';
import { ReactiveFormsModule } from '@angular/forms';
import { SimpleChange } from '@angular/core';

describe('TaskCreateComponent', () => {
  let component: TaskCreateComponent;
  let fixture: ComponentFixture<TaskCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskCreateComponent, ReactiveFormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ✅ should create
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ✅ form invalid when empty
  it('should be invalid when form is empty', () => {
    expect(component.form.invalid).toBeTrue();
  });

  // ✅ form valid when title provided
  it('should be valid when title is provided', () => {
    component.form.setValue({ title: 'Test', description: '' });
    expect(component.form.valid).toBeTrue();
  });

  // ✅ emit save event on valid submit
  it('should emit save event when form is valid', () => {
    spyOn(component.save, 'emit');

    component.form.setValue({
      title: 'Test task',
      description: 'desc',
    });

    component.onSubmit();

    expect(component.save.emit).toHaveBeenCalledWith({
      title: 'Test task',
      description: 'desc',
    });
  });

  // ✅ description becomes null if empty
  it('should emit null description when empty', () => {
    spyOn(component.save, 'emit');

    component.form.setValue({
      title: 'Test task',
      description: '',
    });

    component.onSubmit();

    expect(component.save.emit).toHaveBeenCalledWith({
      title: 'Test task',
      description: null,
    });
  });

  // ✅ should NOT emit when invalid
  it('should not emit when form is invalid', () => {
    spyOn(component.save, 'emit');

    component.form.setValue({
      title: '',
      description: '',
    });

    component.onSubmit();

    expect(component.save.emit).not.toHaveBeenCalled();
  });

  // ✅ should mark form touched when invalid
  it('should mark form as touched when invalid', () => {
    component.form.setValue({
      title: '',
      description: '',
    });

    component.onSubmit();

    expect(component.form.touched).toBeTrue();
  });

  // ✅ should reset form when NOT editing
  it('should reset form after submit when not editing', () => {
    component.task = null;

    component.form.setValue({
      title: 'Test',
      description: 'desc',
    });

    component.onSubmit();

    expect(component.form.value).toEqual({
      title: '',
      description: '',
    });
  });

  // ✅ should NOT reset form when editing
  it('should NOT reset form when editing', () => {
    component.task = { id: 1, title: 'Old', description: 'Old', completed: false };

    component.form.setValue({
      title: 'Updated',
      description: 'Updated',
    });

    component.onSubmit();

    expect(component.form.value).toEqual({
      title: 'Updated',
      description: 'Updated',
    });
  });

  // ✅ should patch form when task input changes
  it('should patch form when task input changes', () => {
    component.task = {
      id: 1,
      title: 'Edit me',
      description: 'desc',
      completed: false,
    };

    component.ngOnChanges({
      task: new SimpleChange(null, component.task, true),
    });

    expect(component.form.value).toEqual({
      title: 'Edit me',
      description: 'desc',
    });
  });

  // ✅ should handle null description in patch
  it('should patch empty string when description is null', () => {
    component.task = {
      id: 1,
      title: 'Edit me',
      description: null,
      completed: false,
    };

    component.ngOnChanges({
      task: new SimpleChange(null, component.task, true),
    });

    expect(component.form.value).toEqual({
      title: 'Edit me',
      description: '',
    });
  });
});