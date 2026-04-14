import { Component, EventEmitter, Output, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreateTaskRequest, Task } from '../task.model';

@Component({
  selector: 'app-task-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './task-create.component.html',
  styleUrl: './task-create.component.scss',
})
export class TaskCreateComponent implements OnChanges {

  @Input() task: Task | null = null;

  @Output() save = new EventEmitter<CreateTaskRequest>();

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    description: [''],
  });

  constructor(private readonly fb: FormBuilder) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task'] && this.task) {
      this.form.patchValue({
        title: this.task.title,
        description: this.task.description ?? '',
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { title, description } = this.form.getRawValue();

    this.save.emit({
      title,
      description: description?.length ? description : null,
    });

    /**
     * Only reset if NOT editing
     */
    if (!this.task) {
      this.form.reset({ title: '', description: '' });
    }
  }
}