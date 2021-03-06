describe('Bin', function() {

  var values = [
    0.1, 0.2, 0.3,
    1.4, 1.5, 1.6,
    2.7, 2.8, 2.9,
    3.1, 3.2, 3.3,
    4.4, 4.5, 4.6,
    5.7, 5.8, 5.9,
    6.1, 6.2, 6.3,
    7.4, 7.5, 7.6,
    8.7, 8.8, 8.9,
    9.1, 9.2, 9.3
  ];
  
  function spec(opt) {
    var bin = {"type": "bin", "field": "v", "output": {"start": "bin_v"}};
    for (var name in opt) bin[name] = opt[name];
    return { 
      "data": [{ 
        "name": "table", 
        "values": values.map(function(x) { return {v:x}; }),
        "transform": [bin]
      }] 
    };
  }

  it('should handle extent calculation', function(done) {
    parseSpec(spec({maxbins: 10}), function(model) {
      var ds = model.data('table'),
          data = ds.values(),
          floored = values.map(function(x) { return ~~x; });

      expect(data.length).to.be.above(0).and.equal(floored.length);
      for (var i=0, len=data.length; i<len; ++i) {
        expect(data[i].bin_v).to.equal(floored[i]);
      }
  
      done();
    }, modelFactory);
  });

  it('should handle step definition', function(done) {
    parseSpec(spec({min:0, max:10, step:1}), function(model) {
      var ds = model.data('table'),
          data = ds.values(),
          floored = values.map(function(x) { return ~~x; });

      expect(data.length).to.be.above(0).and.equal(floored.length);
      for (var i=0, len=data.length; i<len; ++i) {
        expect(data[i].bin_v).to.equal(floored[i]);
        expect(data[i].bin_end).to.equal(floored[i]+1);
        expect(data[i].bin_mid).to.equal(floored[i]+0.5);
      }
  
      done();
    }, modelFactory);
  });

  it('should handle maxbins definition', function(done) {
    parseSpec(spec({min:0, max:10, maxbins: 5}), function(model) {
      var ds = model.data('table'),
          data = ds.values(),
          floored = values.map(function(x) { return ~~x - (~~x % 2); });

      expect(data.length).to.be.above(0).and.equal(floored.length);
      for (var i=0, len=data.length; i<len; ++i) {
        expect(data[i].bin_v).to.equal(floored[i]);
      }
  
      done();
    }, modelFactory);
  });

  it('should handle nulls', function(done) {
    parseSpec(spec({min:0, max:10, step: 1}), function(model) {
      var ds = model.data('table').insert([{v: null}, {v: undefined}]);
      model.fire();
      
      var data = ds.values(),
          floored = values.map(function(x) { return ~~x; });
      floored.push(null, null);

      expect(data.length).to.be.above(0).and.equal(floored.length);
      for (var i=0, len=data.length; i<len; ++i) {
        expect(data[i].bin_v).to.equal(floored[i]);
      }
  
      done();
    }, modelFactory);
  });

  it('should handle streaming adds', function(done) {
    parseSpec(spec({min:0, max:10, step: 2}), function(model) {
      var ds = model.data('table')
        .insert([{v:1.1}])
        .insert([{v:-2.1}])
        .insert([{v:11.2}]);
      ds.fire();
      
      var data = ds.values(),
          floored = values.map(function(x) { return ~~x - (~~x%2); });
      floored.push(0, -2, 10);

      expect(data.length).to.be.above(0).and.equal(floored.length);
      for (var i=0, len=data.length; i<len; ++i) {
        expect(data[i].bin_v).to.equal(floored[i]);
      }
  
      done();
    }, modelFactory);
  });
  
  it('should handle streaming mods', function(done) {
    parseSpec(spec({min:0, max:10, step: 1}), function(model) {
      var ds = model.data('table').update(
        function(d) { return d.v < 2; },
        "v",
        function(d) { return Math.random(); }
      );
      ds.fire();
      
      var data = ds.values(),
          floored = values.map(function(x) { return x < 2 ? 0 : ~~x; });

      expect(data.length).to.be.above(0).and.equal(floored.length);
      for (var i=0, len=data.length; i<len; ++i) {
        expect(data[i].bin_v).to.equal(floored[i]);
      }
  
      done();
    }, modelFactory);
  });

  it('should validate against the schema', function() {
    var schema = schemaPath(transforms.bin.schema),
        validate = validator(schema);

    expect(validate({ "type": "bin", "field": "price" })).to.be.true;
    expect(validate({ "type": "bin", "field": "price", "min": 1 })).to.be.true;
    expect(validate({ "type": "bin", "field": "price", "max": 10 })).to.be.true;
    expect(validate({ "type": "bin", "field": "price", "min": 1, "max": 10 })).to.be.true;
    expect(validate({ "type": "bin", "field": "price", "min": 1, "max": 10, "base": 5 })).to.be.true;
    expect(validate({ "type": "bin", "field": "price", "min": 1, "max": 10, "maxbins": 5 })).to.be.true;
    expect(validate({ "type": "bin", "field": "price", "min": 1, "max": 10, "step": 1 })).to.be.true;
    expect(validate({ "type": "bin", "field": "price", "min": 1, "max": 10, "minstep": 2 })).to.be.true;
    expect(validate({ "type": "bin", "field": "price", "min": 1, "max": 10, "steps": [1, 2, 3, 4, 5] })).to.be.true;
    expect(validate({ "type": "bin", "field": "price", "min": 1, "max": 10, "div": [2, 3, 4] })).to.be.true;

    expect(validate({ "type": "foo" })).to.be.false;
    expect(validate({ "type": "bin" })).to.be.false;
    expect(validate({ "type": "bin", "field": "price", "min": 1, "max": 10, "hello": "world" })).to.be.false;
    expect(validate({ "type": "bin", "field": "price", "min": "1", "max": 10 })).to.be.false;
    expect(validate({ "type": "bin", "field": "price", "min": 1, "max": "10" })).to.be.false;
    expect(validate({ "type": "bin", "field": "price", "min": 1, "max": 10, "base": "5" })).to.be.false;
    expect(validate({ "type": "bin", "field": "price", "min": 1, "max": 10, "maxbins": "5" })).to.be.false;
    expect(validate({ "type": "bin", "field": "price", "min": 1, "max": 10, "step": "1" })).to.be.false;
    expect(validate({ "type": "bin", "field": "price", "min": 1, "max": 10, "minstep": "2" })).to.be.false;
    expect(validate({ "type": "bin", "field": "price", "min": 1, "max": 10, "steps": "1" })).to.be.false;
    expect(validate({ "type": "bin", "field": "price", "min": 1, "max": 10, "steps": ["1", 2, 3, 4, 5] })).to.be.false;
    expect(validate({ "type": "bin", "field": "price", "min": 1, "max": 10, "div": "2" })).to.be.false;
    expect(validate({ "type": "bin", "field": "price", "min": 1, "max": 10, "div": ["2", 3] })).to.be.false;
  });

});